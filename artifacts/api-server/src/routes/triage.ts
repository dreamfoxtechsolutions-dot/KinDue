import { Router } from "express";
import { db, billsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole } from "../lib/memberGuard";

const router = Router();

router.get("/households/:householdId/triage", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!role) return res.status(403).json({ error: "Access denied" });

  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bills = await db.query.billsTable.findMany({
    where: eq(billsTable.householdId, householdId),
  });

  const overdueCount = bills.filter((b) => b.status === "overdue" || (b.status === "approved" && new Date(b.dueDate) < now)).length;
  const dueSoonCount = bills.filter((b) => b.status === "approved" && new Date(b.dueDate) >= now && new Date(b.dueDate) <= sevenDays).length;
  const pendingApprovalCount = bills.filter((b) => b.status === "pending_approval").length;
  const totalMonthlyBills = bills.filter((b) => b.recurrence === "monthly").length;

  const riskScore = Math.min(100, overdueCount * 30 + dueSoonCount * 10 + pendingApprovalCount * 5);

  const topRisks = bills
    .filter((b) => b.status !== "paid" && b.status !== "rejected")
    .sort((a, b) => {
      const aOverdue = new Date(a.dueDate) < now ? 1 : 0;
      const bOverdue = new Date(b.dueDate) < now ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      name: b.name,
      amount: parseFloat(b.amount),
      dueDate: b.dueDate,
      status: b.status,
      category: b.category,
    }));

  res.json({
    householdId,
    overdueCount,
    dueSoonCount,
    pendingApprovalCount,
    totalMonthlyBills,
    riskScore,
    topRisks,
  });
});

export default router;
