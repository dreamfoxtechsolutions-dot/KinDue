import { db, auditLogTable } from "@workspace/db";

export async function logAudit(params: {
  householdId: number;
  actorUserId: number;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: string | null;
}) {
  await db.insert(auditLogTable).values(params).catch(() => {});
}
