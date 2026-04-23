import { db, billsTable, householdMembersTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import { sendPushToUsers } from "./push";
import { logger } from "./logger";

export async function sendOverdueDigest(): Promise<void> {
  const now = new Date();

  const overdueBills = await db.query.billsTable.findMany({
    where: and(eq(billsTable.status, "approved"), lt(billsTable.dueDate, now)),
  });

  if (overdueBills.length === 0) return;

  const byHousehold = new Map<number, typeof overdueBills>();
  for (const bill of overdueBills) {
    const list = byHousehold.get(bill.householdId) ?? [];
    list.push(bill);
    byHousehold.set(bill.householdId, list);
  }

  for (const [householdId, bills] of byHousehold) {
    const primaryMembers = await db.query.householdMembersTable.findMany({
      where: and(
        eq(householdMembersTable.householdId, householdId),
        eq(householdMembersTable.role, "primary_user")
      ),
    });

    const primaryUserIds = primaryMembers.map((m) => m.userId);
    if (primaryUserIds.length === 0) continue;

    const count = bills.length;

    const title = count === 1 ? "Overdue Bill" : `${count} Overdue Bills`;
    const body =
      count === 1
        ? `"${bills[0]!.name}" is past its due date.`
        : `You have ${count} bills that are past their due dates.`;

    const data = { billId: bills[0]!.id };

    await sendPushToUsers(primaryUserIds, { title, body, data }, "pushOverdue");

    logger.info({ householdId, count }, "[overdueDigest] Sent overdue digest");
  }
}

export function scheduleOverdueDigest(): void {
  const MS_IN_DAY = 24 * 60 * 60 * 1000;

  const runAndSchedule = () => {
    sendOverdueDigest().catch((err) => {
      logger.error({ err }, "[overdueDigest] Error sending overdue digest");
    });
    setTimeout(runAndSchedule, MS_IN_DAY);
  };

  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(9, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const msUntilFirst = nextRun.getTime() - now.getTime();
  logger.info({ nextRun }, "[overdueDigest] Scheduled first overdue digest");
  setTimeout(runAndSchedule, msUntilFirst);
}
