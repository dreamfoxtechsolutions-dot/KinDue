import { Router } from "express";
import { db, auditLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getMemberRole, canViewAudit } from "../lib/memberGuard";

const router = Router();

router.get("/households/:householdId/audit", requireAuth, async (req, res) => {
  const householdId = parseInt(req.params.householdId);
  const user = req.dbUser!;
  const role = await getMemberRole(householdId, user.id);
  if (!canViewAudit(role)) return res.status(403).json({ error: "Audit log is restricted to Primary Users and Trustees" });

  const { limit: limitStr, offset: offsetStr } = req.query;
  const limit = Math.min(parseInt(limitStr as string) || 50, 100);
  const offset = parseInt(offsetStr as string) || 0;

  const entries = await db.query.auditLogTable.findMany({
    where: eq(auditLogTable.householdId, householdId),
    orderBy: [desc(auditLogTable.createdAt)],
    limit,
    offset,
  });

  res.json(entries);
});

export default router;
