import { Router } from "express";
import { db, gmailConnectionsTable, gmailBillCandidatesTable, billsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canApprove } from "../lib/memberGuard";
import { logAudit } from "../lib/audit";

const router = Router();

router.get("/households/:householdId/gmail", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

  const connection = await db.query.gmailConnectionsTable.findFirst({
    where: eq(gmailConnectionsTable.householdId, householdId),
  });

  const pendingCount = await db.query.gmailBillCandidatesTable.findMany({
    where: and(
      eq(gmailBillCandidatesTable.householdId, householdId),
      eq(gmailBillCandidatesTable.status, "pending")
    ),
  });

  if (!connection) {
    return res.json({
      id: 0,
      householdId,
      email: "",
      connected: false,
      lastScanAt: null,
      candidatesFound: pendingCount.length,
      createdAt: new Date().toISOString(),
    });
  }

  res.json({
    id: connection.id,
    householdId: connection.householdId,
    email: connection.email,
    connected: connection.connected,
    lastScanAt: connection.lastScanAt,
    candidatesFound: pendingCount.length,
    createdAt: connection.createdAt,
  });
});

router.post("/households/:householdId/gmail/connect", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

  const { code, redirectUri } = req.body;

  const [connection] = await db
    .insert(gmailConnectionsTable)
    .values({
      householdId,
      email: `gmail_${householdId}@placeholder.com`,
      accessToken: code ?? "placeholder",
      refreshToken: null,
      connected: true,
    })
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "gmail.connected",
    entityType: "gmail",
    entityId: connection.id,
    details: "Gmail connected",
  });

  res.status(201).json(connection);
});

router.delete("/households/:householdId/gmail", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

  await db
    .update(gmailConnectionsTable)
    .set({ connected: false })
    .where(eq(gmailConnectionsTable.householdId, householdId));

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "gmail.disconnected",
    entityType: "gmail",
    details: "Gmail disconnected",
  });

  res.status(204).send();
});

router.post("/households/:householdId/gmail/scan", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

  await db
    .update(gmailConnectionsTable)
    .set({ lastScanAt: new Date() })
    .where(eq(gmailConnectionsTable.householdId, householdId));

  const pending = await db.query.gmailBillCandidatesTable.findMany({
    where: and(
      eq(gmailBillCandidatesTable.householdId, householdId),
      eq(gmailBillCandidatesTable.status, "pending")
    ),
  });

  res.json({
    newCandidatesFound: 0,
    totalCandidatesPending: pending.length,
    scannedAt: new Date().toISOString(),
  });
});

router.get("/households/:householdId/gmail/candidates", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

  const candidates = await db.query.gmailBillCandidatesTable.findMany({
    where: and(
      eq(gmailBillCandidatesTable.householdId, householdId),
      eq(gmailBillCandidatesTable.status, "pending")
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  res.json(candidates.map((c) => ({
    ...c,
    extractedAmount: c.extractedAmount ? parseFloat(c.extractedAmount) : null,
  })));
});

router.post("/households/:householdId/gmail/candidates/:candidateId/accept", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const candidateId = parseInt(req.params.candidateId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

  const candidate = await db.query.gmailBillCandidatesTable.findFirst({
    where: and(eq(gmailBillCandidatesTable.id, candidateId), eq(gmailBillCandidatesTable.householdId, householdId)),
  });
  if (!candidate) return res.status(404).json({ error: "Not found" });

  const { name, category, amount, dueDate, recurrence, recurrenceInterval } = req.body;

  const [bill] = await db
    .insert(billsTable)
    .values({
      householdId,
      name: name ?? candidate.extractedBillerName ?? candidate.emailSubject,
      category: category ?? candidate.suggestedCategory ?? "other",
      amount: (amount ?? candidate.extractedAmount ?? 0).toString(),
      currency: "USD",
      dueDate: dueDate ? new Date(dueDate) : candidate.extractedDueDate ?? new Date(),
      recurrence: recurrenceInterval ?? "none",
      status: "approved",
      createdByUserId: user.id,
    })
    .returning();

  await db
    .update(gmailBillCandidatesTable)
    .set({ status: "accepted" })
    .where(eq(gmailBillCandidatesTable.id, candidateId));

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "gmail.candidate_accepted",
    entityType: "bill",
    entityId: bill.id,
    details: `Accepted Gmail candidate as bill "${bill.name}"`,
  });

  res.status(201).json({ ...bill, amount: parseFloat(bill.amount) });
});

router.delete("/households/:householdId/gmail/candidates/:candidateId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const candidateId = parseInt(req.params.candidateId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canApprove(role)) return res.status(403).json({ error: "Access denied" });

  await db
    .update(gmailBillCandidatesTable)
    .set({ status: "dismissed" })
    .where(and(eq(gmailBillCandidatesTable.id, candidateId), eq(gmailBillCandidatesTable.householdId, householdId)));

  res.status(204).send();
});

export default router;
