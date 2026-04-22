import { Router } from "express";
import { db, documentsTable, receiptsTable, billsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canDeleteDocuments } from "../lib/memberGuard";

const router = Router();

router.get("/households/:householdId/documents", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const { billId } = req.query;
  const docs = await db.query.documentsTable.findMany({
    where: billId
      ? and(eq(documentsTable.householdId, householdId), eq(documentsTable.billId, parseInt(billId as string)))
      : eq(documentsTable.householdId, householdId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  res.json(docs);
});

router.post("/households/:householdId/documents", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const { fileName, mimeType, fileSize, storageKey, billId, type } = req.body;

  const [doc] = await db
    .insert(documentsTable)
    .values({
      householdId,
      billId: billId ?? null,
      fileName,
      mimeType,
      fileSize,
      storageKey,
      type: type ?? "other",
      uploadedByUserId: user.id,
    })
    .returning();

  res.status(201).json(doc);
});

router.get("/households/:householdId/documents/:documentId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const documentId = parseInt(req.params.documentId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const doc = await db.query.documentsTable.findFirst({
    where: and(eq(documentsTable.id, documentId), eq(documentsTable.householdId, householdId)),
  });

  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.delete("/households/:householdId/documents/:documentId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const documentId = parseInt(req.params.documentId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canDeleteDocuments(role)) return res.status(403).json({ error: "Only Primary Users and Trustees can delete documents" });

  await db.delete(documentsTable).where(and(eq(documentsTable.id, documentId), eq(documentsTable.householdId, householdId)));
  res.status(204).send();
});

router.get("/households/:householdId/bills/:billId/receipts", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)),
  });
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  const receipts = await db.query.receiptsTable.findMany({
    where: eq(receiptsTable.billId, billId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  res.json(receipts);
});

router.post("/households/:householdId/bills/:billId/receipts", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const billId = parseInt(req.params.billId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const bill = await db.query.billsTable.findFirst({
    where: and(eq(billsTable.id, billId), eq(billsTable.householdId, householdId)),
  });
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  const { fileName, mimeType, fileSize, storageKey } = req.body;

  const [receipt] = await db
    .insert(receiptsTable)
    .values({
      billId,
      fileName,
      mimeType,
      fileSize,
      storageKey,
      uploadedByUserId: user.id,
    })
    .returning();

  res.status(201).json(receipt);
});

export default router;
