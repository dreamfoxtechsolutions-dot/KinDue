import { db, pushTokensTable, notificationSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import type { NotificationSettings } from "@workspace/db";
import { logger } from "./logger";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

type PushSettingKey = keyof Pick<
  NotificationSettings,
  | "pushOverdue"
  | "pushPendingApproval"
  | "pushBillPaid"
  | "pushBillRejected"
  | "pushLowBalance"
>;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPushToUsers(
  userIds: number[],
  message: PushMessage,
  settingKey?: PushSettingKey
): Promise<void> {
  if (userIds.length === 0) return;

  const tokens = await db.query.pushTokensTable.findMany({
    where: inArray(pushTokensTable.userId, userIds),
  });

  if (tokens.length === 0) return;

  let eligibleUserIds: Set<number>;

  if (settingKey) {
    const settings = await db.query.notificationSettingsTable.findMany({
      where: inArray(notificationSettingsTable.userId, userIds),
    });

    const settingMap = new Map(settings.map((s) => [s.userId, s]));

    eligibleUserIds = new Set(
      userIds.filter((id) => {
        const s = settingMap.get(id);
        if (!s) return true;
        return s[settingKey] === true;
      })
    );
  } else {
    eligibleUserIds = new Set(userIds);
  }

  const eligibleTokens = tokens
    .filter((t) => eligibleUserIds.has(t.userId))
    .map((t) => t.token);

  if (eligibleTokens.length === 0) return;

  const messages = eligibleTokens.map((token) => ({
    to: token,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    sound: "default",
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "[push] Expo API returned non-200");
    } else {
      logger.info({ count: messages.length }, "[push] Notifications sent");
    }
  } catch (err) {
    logger.error({ err }, "[push] Failed to send push notifications");
  }
}
