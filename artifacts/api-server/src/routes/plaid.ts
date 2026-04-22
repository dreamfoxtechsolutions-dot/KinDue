import { Router } from "express";
import { db, linkedAccountsTable, transactionsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canViewAccounts } from "../lib/memberGuard";
import { logAudit } from "../lib/audit";

const router = Router();

router.get("/households/:householdId/accounts", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canViewAccounts(role)) return res.status(403).json({ error: "Access denied — financial data is restricted to primary users and trustees" });

  const accounts = await db.query.linkedAccountsTable.findMany({
    where: eq(linkedAccountsTable.householdId, householdId),
    orderBy: [desc(linkedAccountsTable.createdAt)],
  });

  res.json(accounts.map((a) => ({
    ...a,
    currentBalance: a.currentBalance ? parseFloat(a.currentBalance) : null,
    availableBalance: a.availableBalance ? parseFloat(a.availableBalance) : null,
  })));
});

router.post("/households/:householdId/accounts/plaid-link-token", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canViewAccounts(role)) return res.status(403).json({ error: "Access denied" });

  const expiration = new Date(Date.now() + 30 * 60 * 1000);

  res.json({
    linkToken: `link-sandbox-placeholder-${householdId}-${user.id}-${Date.now()}`,
    expiration: expiration.toISOString(),
  });
});

router.post("/households/:householdId/accounts/exchange", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canViewAccounts(role)) return res.status(403).json({ error: "Access denied" });

  const { publicToken, institutionId, institutionName } = req.body;

  const [account] = await db
    .insert(linkedAccountsTable)
    .values({
      householdId,
      plaidItemId: `item_${publicToken}`,
      plaidAccessToken: `access_${publicToken}`,
      plaidAccountId: `account_${publicToken}`,
      institutionName,
      institutionId,
      accountName: "Checking Account",
      accountType: "checking",
      mask: "0000",
      currentBalance: "1000.00",
      availableBalance: "950.00",
    })
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "account.linked",
    entityType: "account",
    entityId: account.id,
    details: `Linked account at ${institutionName}`,
  });

  res.status(201).json({
    ...account,
    currentBalance: account.currentBalance ? parseFloat(account.currentBalance) : null,
    availableBalance: account.availableBalance ? parseFloat(account.availableBalance) : null,
  });
});

router.delete("/households/:householdId/accounts/:accountId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const accountId = parseInt(req.params.accountId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canViewAccounts(role)) return res.status(403).json({ error: "Access denied" });

  await db.delete(linkedAccountsTable).where(and(eq(linkedAccountsTable.id, accountId), eq(linkedAccountsTable.householdId, householdId)));

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "account.unlinked",
    entityType: "account",
    entityId: accountId,
    details: "Account unlinked",
  });

  res.status(204).send();
});

router.post("/households/:householdId/accounts/:accountId/sync", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const accountId = parseInt(req.params.accountId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canViewAccounts(role)) return res.status(403).json({ error: "Access denied" });

  await db
    .update(linkedAccountsTable)
    .set({ lastSyncAt: new Date() })
    .where(and(eq(linkedAccountsTable.id, accountId), eq(linkedAccountsTable.householdId, householdId)));

  res.json({
    transactionsSynced: 0,
    balanceUpdated: true,
    syncedAt: new Date().toISOString(),
  });
});

router.get("/households/:householdId/accounts/:accountId/transactions", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const accountId = parseInt(req.params.accountId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canViewAccounts(role)) return res.status(403).json({ error: "Access denied" });

  const account = await db.query.linkedAccountsTable.findFirst({
    where: and(eq(linkedAccountsTable.id, accountId), eq(linkedAccountsTable.householdId, householdId)),
  });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const transactions = await db.query.transactionsTable.findMany({
    where: eq(transactionsTable.linkedAccountId, accountId),
    orderBy: [desc(transactionsTable.date)],
    limit: 50,
  });

  res.json(transactions.map((t) => ({
    ...t,
    amount: parseFloat(t.amount),
  })));
});

export default router;
