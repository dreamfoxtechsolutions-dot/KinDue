import { Router } from "express";
import {
  db,
  householdsTable,
  householdMembersTable,
  billsTable,
  auditLogTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canManageMembers, canChangeRoles } from "../lib/memberGuard";
import { logAudit } from "../lib/audit";

const router = Router();

const VALID_ROLES = ["primary_user", "trustee", "caregiver", "other"] as const;
type MemberRole = (typeof VALID_ROLES)[number];

function toMemberRole(value: unknown): MemberRole {
  if (typeof value === "string" && VALID_ROLES.includes(value as MemberRole)) {
    return value as MemberRole;
  }
  return "other";
}

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
  const { name, address } = req.body as { name: string; address?: string };

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
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;

  const role = await getMemberRole(householdId, user.id);
  if (!role) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const household = await db.query.householdsTable.findFirst({
    where: eq(householdsTable.id, householdId),
  });

  if (!household) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(household);
});

router.patch("/households/:householdId", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);

  if (!canManageMembers(role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { name, address } = req.body as { name?: string; address?: string };
  const [updated] = await db
    .update(householdsTable)
    .set({ name, address, updatedAt: new Date() })
    .where(eq(householdsTable.id, householdId))
    .returning();

  res.json(updated);
});

router.delete("/households/:householdId", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);

  if (role !== "primary_user") {
    res.status(403).json({ error: "Only primary user can delete household" });
    return;
  }

  await db.delete(householdsTable).where(eq(householdsTable.id, householdId));
  res.status(204).send();
});

router.get("/households/:householdId/dashboard", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const household = await db.query.householdsTable.findFirst({
    where: eq(householdsTable.id, householdId),
  });
  if (!household) {
    res.status(404).json({ error: "Not found" });
    return;
  }

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

  const recentActivity = await db.query.auditLogTable.findMany({
    where: eq(auditLogTable.householdId, householdId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 5,
  });

  const members = await db.query.householdMembersTable.findMany({
    where: eq(householdMembersTable.householdId, householdId),
  });

  const riskScore = Math.min(100, overdueCount * 30 + dueSoonCount * 10 + pendingApprovalCount * 5);

  const triageCandidates = bills
    .filter((b) => b.status === "overdue" || b.status === "pending_approval" || b.status === "approved")
    .map((b) => {
      const amount = parseFloat(b.amount);
      let score = 0;
      let reason = "";
      if (b.status === "overdue") {
        score = 100 + amount / 100;
        reason = "Overdue — immediate attention needed";
      } else if (b.status === "pending_approval") {
        score = 60 + amount / 100;
        reason = "Awaiting approval";
      } else if (b.status === "approved" && new Date(b.dueDate) <= sevenDays) {
        score = 40 + amount / 100;
        reason = "Due within 7 days";
      } else {
        score = 10 + amount / 100;
        reason = "Upcoming bill";
      }
      const typedBill = { ...b, amount } as Omit<typeof b, "amount"> & { amount: number };
      return { bill: typedBill, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, idx) => ({
      bill: item.bill,
      priorityScore: Math.round(item.score),
      priorityReason: item.reason,
      rank: idx + 1,
    }));

  res.json({
    householdId,
    householdName: household.name,
    totalBills: bills.length,
    overdueCount,
    dueSoonCount,
    pendingApprovalCount,
    totalMonthlyBills,
    totalMonthlyEstimate: totalAmount,
    hasLowBalanceRisk: false,
    topTriageItems: triageCandidates,
    memberCount: members.length,
    riskScore,
    recentActivity,
    userRole: role,
  });
});

router.get("/households/:householdId/members", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

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
      inviteEmail: m.inviteEmail ?? null,
      inviteStatus: m.inviteEmail ? "pending" : "accepted",
      displayName: m.user?.displayName ?? m.inviteEmail ?? "Unknown",
      email: m.user?.email ?? m.inviteEmail ?? "",
      avatarUrl: m.user?.avatarUrl ?? null,
      joinedAt: m.joinedAt,
    }))
  );
});

router.post("/households/:householdId/members", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canManageMembers(role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { email, role: memberRole } = req.body as { email: string; role?: unknown };

  const { usersTable: ut } = await import("@workspace/db");
  const targetUser = await db.query.usersTable.findFirst({
    where: eq(ut.email, email),
  });

  const existingInvite = await db.query.householdMembersTable.findFirst({
    where: and(
      eq(householdMembersTable.householdId, householdId),
      eq(householdMembersTable.inviteEmail, email),
    ),
  });

  if (existingInvite) {
    const [refreshed] = await db
      .update(householdMembersTable)
      .set({ updatedAt: new Date() })
      .where(eq(householdMembersTable.id, existingInvite.id))
      .returning();

    await logAudit({
      householdId,
      actorUserId: user.id,
      actorName: user.displayName,
      action: "member.invite_resent",
      entityType: "member",
      entityId: existingInvite.id,
      details: `Resent invite to ${email}`,
    });

    res.status(200).json(refreshed);
    return;
  }

  const [member] = await db
    .insert(householdMembersTable)
    .values({
      householdId,
      userId: targetUser?.id ?? user.id,
      role: toMemberRole(memberRole),
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
    details: `Invited ${email} as ${String(memberRole ?? "other")}`,
  });

  res.status(201).json(member);
});

router.patch("/households/:householdId/members/:memberId", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const memberId = parseInt(String(req.params["memberId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canChangeRoles(role)) {
    res.status(403).json({ error: "Only the Primary User can change member roles" });
    return;
  }

  const { role: newRole } = req.body as { role?: unknown };
  const safeNewRole = toMemberRole(newRole);

  const [updated] = await db
    .update(householdMembersTable)
    .set({ role: safeNewRole, updatedAt: new Date() })
    .where(and(eq(householdMembersTable.id, memberId), eq(householdMembersTable.householdId, householdId)))
    .returning();

  await logAudit({
    householdId,
    actorUserId: user.id,
    actorName: user.displayName,
    action: "member.role_changed",
    entityType: "member",
    entityId: memberId,
    details: `Changed role to ${safeNewRole}`,
  });

  res.json(updated);
});

router.delete("/households/:householdId/members/:memberId", requireAuth, async (req, res) => {
  const householdId = parseInt(String(req.params["householdId"]));
  const memberId = parseInt(String(req.params["memberId"]));
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canManageMembers(role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

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
