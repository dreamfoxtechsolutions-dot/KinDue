import { Router } from "express";
import {
  db,
  billsTable,
  householdMembersTable,
  auditLogTable,
  documentsTable,
  receiptsTable,
  paymentsTable,
} from "@workspace/db";
import { and, eq, desc, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  getMemberRole,
  canApprove,
  canViewAudit,
  canManageMembers,
  requiresReceiptForPayment,
} from "../lib/memberGuard";
import { logAudit } from "../lib/audit";

const router = Router();

async function getUserHousehold(userId: number) {
  const membership = await db.query.householdMembersTable.findFirst({
    where: eq(householdMembersTable.userId, userId),
    with: { household: true },
  });
  return membership ?? null;
}

const CATEGORY_MAP: Record<string, string> = {
  Housing: "mortgage_rent",
  Utilities: "utilities",
  Insurance: "insurance",
  Medical: "other",
  Subscription: "subscription",
  Food: "other",
  Transportation: "auto_loan",
  Other: "other",
};

const FREQUENCY_MAP: Record<string, string> = {
  one_time: "none",
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  annual: "annual",
};

const ACTION_MAP: Record<string, string> = {
  "bill.created": "bill_created",
  "bill.updated": "bill_updated",
  "bill.approved": "bill_approved",
  "bill.rejected": "bill_rejected",
  "bill.paid": "payment_recorded",
  "bill.deleted": "bill_deleted",
  "member.invited": "member_invited",
  "member.role_changed": "member_role_changed",
  "member.removed": "member_removed",
  "household.created": "household_created",
  "triage.run": "triage_run",
};

function normalizeBill(bill: Record<string, unknown>) {
  return {
    ...bill,
    title: bill.name,
    due_date: bill.dueDate,
    frequency: bill.recurrence,
  };
}

function computeRisk(bill: Record<string, unknown>, now: Date): "high" | "medium" | "low" {
  const dueDate = bill.dueDate ? new Date(bill.dueDate as string) : null;
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const status = bill.status as string;

  if (status === "overdue" || (dueDate && dueDate < now && status !== "paid" && status !== "rejected")) {
    return "high";
  }
  if (dueDate && dueDate <= sevenDays && (status === "approved" || status === "pending_approval")) {
    return "medium";
  }
  return "low";
}

router.get("/households/mine", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "No household found" });
    return;
  }

  res.json({ ...membership.household, myRole: membership.role });
});

router.get("/households/mine/members", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "No household found" });
    return;
  }

  const householdId = membership.householdId;
  const members = await db.query.householdMembersTable.findMany({
    where: eq(householdMembersTable.householdId, householdId),
    with: { user: true },
  });

  res.json(
    members.map((m) => ({
      id: m.id,
      householdId: m.householdId,
      userId: m.userId,
      role: m.role,
      displayName: m.user?.displayName ?? m.inviteEmail ?? "Unknown",
      email: m.user?.email ?? m.inviteEmail ?? "",
      avatarUrl: m.user?.avatarUrl ?? null,
      joinedAt: m.joinedAt,
      invite_email: m.inviteEmail,
      user: m.user
        ? {
            name: m.user.displayName,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
          }
        : null,
    }))
  );
});

router.post("/households/mine/members/invite", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "No household found" });
    return;
  }

  const householdId = membership.householdId;
  const role = await getMemberRole(householdId, user.id);
  if (!canManageMembers(role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { email, role: memberRole } = req.body as { email: string; role?: string };

  const validRoles = ["primary_user", "trustee", "caregiver", "other"] as const;
  type MemberRole = (typeof validRoles)[number];
  const safeRole: MemberRole = (
    validRoles.includes((memberRole ?? "other") as MemberRole)
      ? (memberRole ?? "other")
      : "other"
  ) as MemberRole;

  const { usersTable: ut } = await import("@workspace/db");
  const targetUser = await db.query.usersTable.findFirst({
    where: eq(ut.email, email),
  });

  const [member] = await db
    .insert(householdMembersTable)
    .values({
      householdId,
      userId: targetUser?.id ?? user.id,
      role: safeRole,
      inviteEmail: email,
    })
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "member.invited",
    entityType: "member",
    entityId: member.id,
    details: `Invited ${email} as ${memberRole ?? "other"}`,
  });

  res.status(201).json(member);
});

router.get("/bills", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.json([]);
    return;
  }

  const householdId = membership.householdId;
  const bills = await db.query.billsTable.findMany({
    where: eq(billsTable.householdId, householdId),
    orderBy: [desc(billsTable.dueDate)],
  });

  res.json(bills.map((b) => normalizeBill({ ...b, amount: parseFloat(b.amount) })));
});

router.post("/bills", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(400).json({ error: "You must belong to a household before adding bills" });
    return;
  }

  const householdId = membership.householdId;
  const role = await getMemberRole(householdId, user.id);

  const {
    title,
    name,
    amount,
    due_date,
    dueDate,
    category,
    frequency,
    recurrence,
    notes,
    payee,
    currency,
    receiptRequired,
  } = req.body as Record<string, unknown>;

  const billName = String(name ?? title ?? "Untitled");
  const billDueDateRaw = String(dueDate ?? due_date ?? new Date().toISOString());
  const recurrenceKey = String(recurrence ?? frequency ?? "one_time");
  const billRecurrence = FREQUENCY_MAP[recurrenceKey] ?? recurrenceKey;
  const categoryKey = String(category ?? "Other");
  const mappedCategory = CATEGORY_MAP[categoryKey] ?? categoryKey.toLowerCase();

  const validCategories = [
    "utilities",
    "telecom",
    "insurance",
    "mortgage_rent",
    "auto_loan",
    "credit_card",
    "tolls",
    "subscription",
    "other",
  ] as const;
  const billCategory = (
    validCategories.includes(mappedCategory as (typeof validCategories)[number])
      ? mappedCategory
      : "other"
  ) as (typeof validCategories)[number];

  const status = canApprove(role) ? "approved" : "pending_approval";

  const [bill] = await db
    .insert(billsTable)
    .values({
      householdId,
      name: billName,
      category: billCategory,
      amount: String(amount ?? 0),
      currency: String(currency ?? "USD"),
      dueDate: new Date(billDueDateRaw),
      payee: payee != null ? String(payee) : null,
      notes: notes != null ? String(notes) : null,
      recurrence: (billRecurrence as typeof billsTable.$inferInsert["recurrence"]) ?? "none",
      status,
      receiptRequired: Boolean(receiptRequired ?? false),
      createdByUserId: user.id,
    })
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.created",
    entityType: "bill",
    entityId: bill.id,
    details: `Created bill "${billName}" for $${String(amount)}`,
  });

  res.status(201).json(normalizeBill({ ...bill, amount: parseFloat(bill.amount) }));
});

router.get("/bills/:billId", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const billId = parseInt(String(req.params["billId"]));
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, membership.householdId)),
  });

  if (!bill) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(normalizeBill({ ...bill, amount: parseFloat(bill.amount) }));
});

router.post("/bills/:billId/approve", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const billId = parseInt(String(req.params["billId"]));
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const householdId = membership.householdId;
  const role = await getMemberRole(householdId, user.id);

  if (!canApprove(role)) {
    res.status(403).json({ error: "Only primary_user or trustee can approve bills" });
    return;
  }

  const [updated] = await db
    .update(billsTable)
    .set({ status: "approved", approvedByUserId: user.id, updatedAt: new Date() })
    .where(and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.approved",
    entityType: "bill",
    entityId: billId,
    details: `Approved bill "${updated.name}"`,
  });

  res.json(normalizeBill({ ...updated, amount: parseFloat(updated.amount) }));
});

router.post("/bills/:billId/reject", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const billId = parseInt(String(req.params["billId"]));
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const householdId = membership.householdId;
  const role = await getMemberRole(householdId, user.id);

  if (!canApprove(role)) {
    res.status(403).json({ error: "Only primary_user or trustee can reject bills" });
    return;
  }

  const { reason } = req.body as { reason?: string };

  const [updated] = await db
    .update(billsTable)
    .set({ status: "rejected", rejectionReason: reason ?? null, updatedAt: new Date() })
    .where(and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.rejected",
    entityType: "bill",
    entityId: billId,
    details: `Rejected bill "${updated.name}": ${reason ?? "no reason"}`,
  });

  res.json(normalizeBill({ ...updated, amount: parseFloat(updated.amount) }));
});

router.get("/bills/:billId/payments", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const billId = parseInt(String(req.params["billId"]));
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, membership.householdId)),
  });

  if (!bill) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const records = await db.query.paymentsTable.findMany({
    where: eq(paymentsTable.billId, billId),
    orderBy: [desc(paymentsTable.paidAt)],
  });

  const payments = records.map((p) => ({
    id: p.id,
    bill_id: p.billId,
    amount: parseFloat(p.amount),
    paid_at: p.paidAt,
    method: p.method,
    notes: p.notes,
    created_at: p.createdAt,
  }));

  if (bill.paidAt && records.length === 0) {
    payments.push({
      id: 0,
      bill_id: bill.id,
      amount: parseFloat(bill.amount),
      paid_at: bill.paidAt,
      method: "bank_transfer",
      notes: null,
      created_at: bill.paidAt,
    });
  }

  res.json(payments);
});

router.post("/bills/:billId/payments", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const billId = parseInt(String(req.params["billId"]));
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const householdId = membership.householdId;
  const role = await getMemberRole(householdId, user.id);

  if (!role) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)),
  });

  if (!bill) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const {
    amount,
    paid_at,
    method,
    notes,
    receiptStorageKey,
    receiptFileName,
    receiptMimeType,
    receiptFileSize,
  } = req.body as {
    amount?: number;
    paid_at?: string;
    method?: string;
    notes?: string;
    receiptStorageKey?: string;
    receiptFileName?: string;
    receiptMimeType?: string;
    receiptFileSize?: number;
  };

  if (requiresReceiptForPayment(role) && !receiptStorageKey) {
    res.status(400).json({
      error: "Caregivers and Other members must provide a receipt when recording payments",
    });
    return;
  }

  const paymentAmount = amount != null ? Number(amount) : parseFloat(bill.amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    res.status(400).json({ error: "amount must be a positive number" });
    return;
  }

  const paymentDate = paid_at ? new Date(paid_at) : new Date();
  if (isNaN(paymentDate.getTime())) {
    res.status(400).json({ error: "paid_at must be a valid date" });
    return;
  }

  const paymentMethod = method ?? "bank_transfer";

  await db.insert(paymentsTable).values({
    billId,
    amount: String(paymentAmount),
    paidAt: paymentDate,
    method: paymentMethod,
    notes: notes ?? null,
    paidByUserId: user.id,
  });

  if (receiptStorageKey) {
    await db.insert(receiptsTable).values({
      billId,
      fileName: receiptFileName ?? "receipt",
      mimeType: receiptMimeType ?? "application/octet-stream",
      fileSize: receiptFileSize ?? 0,
      storageKey: receiptStorageKey,
      uploadedByUserId: user.id,
    });
  }

  const [totalResult] = await db
    .select({ total: sum(paymentsTable.amount) })
    .from(paymentsTable)
    .where(eq(paymentsTable.billId, billId));

  const totalPaid = parseFloat(totalResult?.total ?? "0");
  const billAmount = parseFloat(bill.amount);
  const isFullyPaid = totalPaid >= billAmount;

  const newStatus = isFullyPaid ? "paid" : bill.status;
  const newPaidAt = isFullyPaid ? paymentDate : bill.paidAt;

  const [updated] = await db
    .update(billsTable)
    .set({ status: newStatus, paidAt: newPaidAt, updatedAt: new Date() })
    .where(eq(billsTable.id, billId))
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: isFullyPaid ? "bill.paid" : "bill.partial_payment",
    entityType: "bill",
    entityId: billId,
    details: `Recorded payment of $${paymentAmount.toFixed(2)} for bill "${updated.name}" (total paid: $${totalPaid.toFixed(2)} of $${billAmount.toFixed(2)})`,
  });

  res.json(normalizeBill({ ...updated, amount: parseFloat(updated.amount) }));
});

router.get("/triage", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.json([]);
    return;
  }

  const householdId = membership.householdId;
  const now = new Date();

  const bills = await db.query.billsTable.findMany({
    where: eq(billsTable.householdId, householdId),
    orderBy: [desc(billsTable.dueDate)],
  });

  const triageItems = bills
    .filter((b) => b.status !== "paid" && b.status !== "rejected")
    .map((b) => {
      const risk = computeRisk(b as unknown as Record<string, unknown>, now);
      return {
        id: b.id,
        bill_id: b.id,
        risk,
        score: risk === "high" ? 90 : risk === "medium" ? 50 : 10,
        reason:
          b.status === "overdue"
            ? "Bill is overdue"
            : b.status === "pending_approval"
              ? "Awaiting approval"
              : null,
        bill: {
          id: b.id,
          title: b.name,
          name: b.name,
          amount: parseFloat(b.amount),
          dueDate: b.dueDate,
          due_date: b.dueDate,
          status: b.status,
          category: b.category,
        },
      };
    });

  res.json(triageItems);
});

router.post("/triage/run", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.json({ message: "No household to triage" });
    return;
  }

  const householdId = membership.householdId;
  const now = new Date();

  const bills = await db.query.billsTable.findMany({
    where: eq(billsTable.householdId, householdId),
  });

  const overdueIds = bills
    .filter((b) => b.status !== "paid" && b.status !== "rejected" && new Date(b.dueDate) < now)
    .map((b) => b.id);

  for (const id of overdueIds) {
    await db
      .update(billsTable)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(and(eq(billsTable.id, id), eq(billsTable.householdId, householdId)));
  }

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "triage.run",
    entityType: "household",
    entityId: householdId,
    details: `Ran triage — ${overdueIds.length} bill(s) marked overdue`,
  });

  res.json({ message: "Triage complete", overdueMarked: overdueIds.length });
});

router.get("/audit", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.json([]);
    return;
  }

  const householdId = membership.householdId;
  const role = await getMemberRole(householdId, user.id);

  if (!canViewAudit(role)) {
    res.status(403).json({
      error: "Audit log is restricted to Primary Users and Trustees",
    });
    return;
  }

  const entries = await db.query.auditLogTable.findMany({
    where: eq(auditLogTable.householdId, householdId),
    orderBy: [desc(auditLogTable.createdAt)],
    limit: 100,
  });

  res.json(
    entries.map((e) => ({
      id: e.id,
      householdId: e.householdId,
      action: ACTION_MAP[e.action] ?? e.action.replace(/\./g, "_"),
      description: e.details,
      created_at: e.createdAt,
      actor: {
        name: e.actorName,
        userId: e.actorUserId,
      },
      entityType: e.entityType,
      entityId: e.entityId,
    }))
  );
});

router.get("/documents", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const membership = await getUserHousehold(user.id);

  if (!membership) {
    res.json([]);
    return;
  }

  const householdId = membership.householdId;
  const docs = await db.query.documentsTable.findMany({
    where: eq(documentsTable.householdId, householdId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  res.json(docs);
});

export default router;
