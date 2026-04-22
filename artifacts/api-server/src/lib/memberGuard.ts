import { db, householdMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type MemberRole = "primary_user" | "trustee" | "caregiver" | "other";

export async function getMemberRole(
  householdId: number,
  userId: number
): Promise<MemberRole | null> {
  const member = await db.query.householdMembersTable.findFirst({
    where: and(
      eq(householdMembersTable.householdId, householdId),
      eq(householdMembersTable.userId, userId)
    ),
  });
  return (member?.role as MemberRole) ?? null;
}

export function canApprove(role: MemberRole | null): boolean {
  return role === "primary_user" || role === "trustee";
}

export function canViewAccounts(role: MemberRole | null): boolean {
  return role === "primary_user" || role === "trustee";
}

export function canManageMembers(role: MemberRole | null): boolean {
  return role === "primary_user" || role === "trustee";
}

export function canViewAudit(role: MemberRole | null): boolean {
  return role === "primary_user" || role === "trustee";
}

export function canDeleteDocuments(role: MemberRole | null): boolean {
  return role === "primary_user" || role === "trustee";
}

export function requiresReceiptForPayment(role: MemberRole | null): boolean {
  return role === "caregiver" || role === "other";
}
