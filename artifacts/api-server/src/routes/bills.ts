import { Router } from "express";
import { db, billsTable, receiptsTable, documentsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canApprove } from "../lib/memberGuard";
import { logAudit } from "../lib/audit";

const router = Router();

router.get("/households/:householdId/bills", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const { status } = req.query;
  const bills = await db.query.billsTable.findMany({
    where: status
      ? and(eq(billsTable.householdId, householdId), eq(billsTable.status, status as string))
      : eq(billsTable.householdId, householdId),
    orderBy: [desc(billsTable.dueDate)],
  });

  res.json(bills.map((b) => ({ ...b, amount: parseFloat(b.amount) })));
});

router.post("/households/:householdId/bills", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const { name, category, amount, currency, dueDate, payee, notes, recurrence, receiptRequired } = req.body;

  const status = canApprove(role) ? "approved" : "pending_approval";

  const [bill] = await db
    .insert(billsTable)
    .values({
      householdId,
      name,
      category: category ?? "other",
      amount: amount.toString(),
      currency: currency ?? "USD",
      dueDate: new Date(dueDate),
      payee,
      notes,
      recurrence: recurrence ?? "none",
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
    details: `Created bill "${name}" for $${amount}`,
  });

  res.status(201).json({ ...bill, amount: parseFloat(bill.amount) });
});

router.get("/households/:householdId/bills/:billId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)),
  });

  if (!bill) return res.status(404).json({ error: "Not found" });

  res.json({ ...bill, amount: parseFloat(bill.amount) });
});

router.patch("/households/:householdId/bills/:billId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)),
  });
  if (!bill) return res.status(404).json({ error: "Not found" });

  const { name, category, amount, currency, dueDate, payee, notes, recurrence, receiptRequired } = req.body;

  const [updated] = await db
    .update(billsTable)
    .set({
      name: name ?? bill.name,
      category: category ?? bill.category,
      amount: amount != null ? amount.toString() : bill.amount,
      currency: currency ?? bill.currency,
      dueDate: dueDate ? new Date(dueDate) : bill.dueDate,
      payee: payee ?? bill.payee,
      notes: notes ?? bill.notes,
      recurrence: recurrence ?? bill.recurrence,
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
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

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
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Only primary_user or trustee can approve bills" });

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

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.post("/households/:householdId/bills/:billId/reject", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Only primary_user or trustee can reject bills" });

  const { reason } = req.body;

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

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.post("/households/:householdId/bills/:billId/pay", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)),
  });
  if (!bill) return res.status(404).json({ error: "Not found" });

  if ((role === "caregiver" || role === "other") && bill.receiptRequired) {
    const receipts = await db.query.receiptsTable.findMany({
      where: eq(receiptsTable.billId, billId),
    });
    if (receipts.length === 0) {
      return res.status(400).json({ error: "Receipt required before marking this bill as paid" });
    }
  }

  const { receiptStorageKey, receiptFileName, receiptMimeType, receiptFileSize } = req.body;

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

  const [updated] = await db
    .update(billsTable)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
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

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

export default router;
