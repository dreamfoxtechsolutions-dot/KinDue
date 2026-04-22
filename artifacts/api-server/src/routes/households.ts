import { Router } from "express";
import {
  db,
  householdsTable,
  householdMembersTable,
  billsTable,
  auditLogTable,
} from "@workspace/db";
import { and, eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canManageMembers, canChangeRoles } from "../lib/memberGuard";
import { logAudit } from "../lib/audit";

const router = Router();

router.get("/households", requireAuth, async (req, res) => {
  const user = req.dbUser!;

  const memberships = await db.query.householdMembersTable.findMany({
    where: eq(householdMembersTable.userId, user.id),
    with: { household: true },
  });

  const result = memberships.map((m) => ({
    ...m.household,
    role: m.role,
    memberCount: 0,
  }));

  res.json(result);
});

router.post("/households", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const { name, address } = req.body;

  const [household] = await db
    .insert(householdsTable)
    .values({ name, address, createdByUserId: user.id })
    .returning();

  await db.insert(householdMembersTable).values({
    householdId: household.id,
    userId: user.id,
    role: "primary_user",
  });

  await logAudit({
    householdId: household.id,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "household.created",
    entityType: "household",
    entityId: household.id,
    details: `Created household "${name}"`,
  });

  res.status(201).json(household);
});

router.get("/households/:householdId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;

  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const household = await db.query.householdsTable.findFirst({
    where: eq(householdsTable.id, householdId),
  });

  if (!household) return res.status(404).json({ error: "Not found" });

  res.json(household);
});

router.patch("/households/:householdId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);

  if (!canManageMembers(role)) return res.status(403).json({ error: "Access denied" });

  const { name, address } = req.body;
  const [updated] = await db
    .update(householdsTable)
    .set({ name, address, updatedAt: new Date() })
    .where(eq(householdsTable.id, householdId))
    .returning();

  res.json(updated);
});

router.delete("/households/:householdId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);

  if (role !== "primary_user") return res.status(403).json({ error: "Only primary user can delete household" });

  await db.delete(householdsTable).where(eq(householdsTable.id, householdId));
  res.status(204).send();
});

router.get("/households/:householdId/dashboard", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const household = await db.query.householdsTable.findFirst({
    where: eq(householdsTable.id, householdId),
  });
  if (!household) return res.status(404).json({ error: "Not found" });

  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bills = await db.query.billsTable.findMany({
    where: eq(billsTable.householdId, householdId),
  });

  const overdueCount = bills.filter((b) => b.status === "overdue" || (b.status === "approved" && new Date(b.dueDate) < now)).length;
  const dueSoonCount = bills.filter((b) => b.status === "approved" && new Date(b.dueDate) >= now && new Date(b.dueDate) <= sevenDays).length;
  const pendingApprovalCount = bills.filter((b) => b.status === "pending_approval").length;
  const totalMonthlyBills = bills.filter((b) => b.status !== "paid" && b.status !== "rejected").length;
  const totalAmount = bills.filter((b) => b.status !== "paid" && b.status !== "rejected").reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const recentAudit = await db.query.auditLogTable.findMany({
    where: eq(auditLogTable.householdId, householdId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 5,
  });

  const members = await db.query.householdMembersTable.findMany({
    where: eq(householdMembersTable.householdId, householdId),
  });

  const riskScore = Math.min(100, overdueCount * 30 + dueSoonCount * 10 + pendingApprovalCount * 5);

  res.json({
    householdId,
    householdName: household.name,
    totalBills: bills.length,
    overdueCount,
    dueSoonCount,
    pendingApprovalCount,
    totalMonthlyBills,
    totalMonthlyAmount: totalAmount,
    memberCount: members.length,
    riskScore,
    recentAudit,
    userRole: role,
  });
});

router.get("/households/:householdId/members", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

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
    }))
  );
});

router.post("/households/:householdId/members", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canManageMembers(role)) return res.status(403).json({ error: "Access denied" });

  const { email, role: memberRole } = req.body;

  const { usersTable: ut } = await import("@workspace/db");
  const targetUser = await db.query.usersTable.findFirst({
    where: eq(ut.email, email),
  });

  const [member] = await db
    .insert(householdMembersTable)
    .values({
      householdId,
      userId: targetUser?.id ?? user.id,
      role: memberRole ?? "other",
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

router.patch("/households/:householdId/members/:memberId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const memberId = parseInt(req.params.memberId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canChangeRoles(role)) return res.status(403).json({ error: "Only the Primary User can change member roles" });

  const { role: newRole } = req.body;

  const [updated] = await db
    .update(householdMembersTable)
    .set({ role: newRole, updatedAt: new Date() })
    .where(and(eq(householdMembersTable.id, memberId), eq(householdMembersTable.householdId, householdId)))
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "member.role_changed",
    entityType: "member",
    entityId: memberId,
    details: `Changed role to ${newRole}`,
  });

  res.json(updated);
});

router.delete("/households/:householdId/members/:memberId", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const memberId = parseInt(req.params.memberId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canManageMembers(role)) return res.status(403).json({ error: "Access denied" });

  await db
    .delete(householdMembersTable)
    .where(and(eq(householdMembersTable.id, memberId), eq(householdMembersTable.householdId, householdId)));

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "member.removed",
    entityType: "member",
    entityId: memberId,
    details: "Member removed",
  });

  res.status(204).send();
});

export default router;
