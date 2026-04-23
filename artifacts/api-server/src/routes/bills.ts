import { Router } from "express";
import { db, billsTable, receiptsTable, householdMembersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canApprove, requiresReceiptForPayment } from "../lib/memberGuard";
import { logAudit } from "../lib/audit";
import { sendPushToUsers } from "../lib/push";

const router = Router();

router.get("/households/:householdId/bills", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { status } = req.query;
  const bills = await db.query.billsTable.findMany({
    where: status
      ? and(eq(billsTable.householdId, householdId), eq(billsTable.status, status as "approved"))
      : eq(billsTable.householdId, householdId),
    orderBy: [desc(billsTable.dueDate)],
  });

  res.json(bills.map((b) => ({ ...b, amount: parseFloat(b.amount) })));
});

router.post("/households/:householdId/bills", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { name, category, amount, currency, dueDate, payee, notes, recurrence, receiptRequired } = req.body as {
    name: string;
    category?: string;
    amount: number;
    currency?: string;
    dueDate: string;
    payee?: string;
    notes?: string;
    recurrence?: string;
    receiptRequired?: boolean;
  };

  const status = canApprove(role) ? "approved" : "pending_approval";

  const [bill] = await db
    .insert(billsTable)
    .values({
      householdId,
      name,
      category: (category ?? "other") as "other",
      amount: amount.toString(),
      currency: currency ?? "USD",
      dueDate: new Date(dueDate),
      payee,
      notes,
      recurrence: (recurrence ?? "none") as "none",
      status,
      receiptRequired: receiptRequired ?? false,
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
    details: `Created bill "${name}" for $${String(amount)}`,
  });

  res.status(201).json({ ...bill, amount: parseFloat(bill.amount) });
});

router.get("/households/:householdId/bills/:billId", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const billId = parseInt(String(req.params["billId"]));
  const user = req.dbUser!;
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

  res.json({ ...bill, amount: parseFloat(bill.amount) });
});

router.patch("/households/:householdId/bills/:billId", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const billId = parseInt(String(req.params["billId"]));
  const user = req.dbUser!;
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

  const { name, category, amount, currency, dueDate, payee, notes, recurrence, receiptRequired } = req.body as {
    name?: string;
    category?: string;
    amount?: number;
    currency?: string;
    dueDate?: string;
    payee?: string;
    notes?: string;
    recurrence?: string;
    receiptRequired?: boolean;
  };

  const [updated] = await db
    .update(billsTable)
    .set({
      name: name ?? bill.name,
      category: (category ?? bill.category) as typeof bill.category,
      amount: amount != null ? amount.toString() : bill.amount,
      currency: currency ?? bill.currency,
      dueDate: dueDate ? new Date(dueDate) : bill.dueDate,
      payee: payee ?? bill.payee,
      notes: notes ?? bill.notes,
      recurrence: (recurrence ?? bill.recurrence) as typeof bill.recurrence,
      receiptRequired: receiptRequired ?? bill.receiptRequired,
      updatedAt: new Date(),
    })
    .where(eq(billsTable.id, billId))
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.updated",
    entityType: "bill",
    entityId: billId,
    details: `Updated bill "${updated.name}"`,
  });

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.delete("/households/:householdId/bills/:billId", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const billId = parseInt(String(req.params["billId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(billsTable).where(and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)));

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.deleted",
    entityType: "bill",
    entityId: billId,
    details: "Bill deleted",
  });

  res.status(204).send();
});

router.post("/households/:householdId/bills/:billId/approve", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const billId = parseInt(String(req.params["billId"]));
  const user = req.dbUser!;
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

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.approved",
    entityType: "bill",
    entityId: billId,
    details: `Approved bill "${updated.name}"`,
  });

  if (updated.createdByUserId && updated.createdByUserId !== user.id) {
    await sendPushToUsers(
      [updated.createdByUserId],
      {
        title: "Bill Approved",
        body: `"${updated.name}" has been approved.`,
        data: { billId: updated.id },
      }
    );
  }

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.post("/households/:householdId/bills/:billId/reject", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const billId = parseInt(String(req.params["billId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) {
    res.status(403).json({ error: "Only primary_user or trustee can reject bills" });
    return;
  }

  const { reason } = req.body as { reason?: string };

  const [updated] = await db
    .update(billsTable)
    .set({ status: "rejected", rejectionReason: reason, updatedAt: new Date() })
    .where(and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)))
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.rejected",
    entityType: "bill",
    entityId: billId,
    details: `Rejected bill "${updated.name}": ${reason ?? "no reason"}`,
  });

  if (updated.createdByUserId && updated.createdByUserId !== user.id) {
    const body = reason
      ? `"${updated.name}" was rejected: ${reason}`
      : `"${updated.name}" has been rejected.`;
    await sendPushToUsers([updated.createdByUserId], {
      title: "Bill Rejected",
      body,
      data: { billId: updated.id },
    });
  }

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.post("/households/:householdId/bills/:billId/mark-paid", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const billId = parseInt(String(req.params["billId"]));
  const user = req.dbUser!;
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

  const { receiptStorageKey, receiptFileName, receiptMimeType, receiptFileSize, paidDate } = req.body as {
    receiptStorageKey?: string;
    receiptFileName?: string;
    receiptMimeType?: string;
    receiptFileSize?: number;
    paidDate?: string;
  };

  if (requiresReceiptForPayment(role) && !receiptStorageKey) {
    res.status(400).json({ error: "Caregivers and Other members must provide a receipt when recording payments" });
    return;
  }

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

  const resolvedPaidAt = paidDate ? new Date(paidDate) : new Date();

  const [updated] = await db
    .update(billsTable)
    .set({ status: "paid", paidAt: resolvedPaidAt, updatedAt: new Date() })
    .where(eq(billsTable.id, billId))
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "bill.paid",
    entityType: "bill",
    entityId: billId,
    details: `Marked bill "${updated.name}" as paid`,
  });

  const primaryAndTrusteeMembers = await db.query.householdMembersTable.findMany({
    where: eq(householdMembersTable.householdId, householdId),
  });

  const notifyUserIds = primaryAndTrusteeMembers
    .filter((m) => (m.role === "primary_user" || m.role === "trustee") && m.userId !== user.id)
    .map((m) => m.userId);

  if (notifyUserIds.length > 0) {
    await sendPushToUsers(notifyUserIds, {
      title: "Bill Paid",
      body: `"${updated.name}" has been marked as paid.`,
      data: { billId: updated.id },
    });
  }

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

export default router;
