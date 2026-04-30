import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { useBills } from "@/lib/api-hooks";
import { differenceInCalendarDays, parseISO } from "date-fns";

export type AlertSettings = {
  enabled: boolean;
  leadDays: [number, number, number];
  geoEnabled: boolean;
  awayThresholdDays: number;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  leadDays: [14, 7, 1],
  geoEnabled: false,
  awayThresholdDays: 90,
};

export const AWAY_THRESHOLD_OPTIONS = [30, 60, 90, 180] as const;

export function getAlertSettings(
  metadata: Record<string, unknown> | undefined,
): AlertSettings {
  const raw = (metadata ?? {})["alertSettings"] as
    | Partial<AlertSettings>
    | undefined;
  if (!raw) return DEFAULT_ALERT_SETTINGS;
  const lead = Array.isArray(raw.leadDays) ? raw.leadDays : undefined;
  const leadDays: [number, number, number] =
    lead && lead.length === 3 && lead.every((n) => typeof n === "number")
      ? [lead[0]!, lead[1]!, lead[2]!]
      : DEFAULT_ALERT_SETTINGS.leadDays;
  const threshold =
    typeof raw.awayThresholdDays === "number" && raw.awayThresholdDays > 0
      ? raw.awayThresholdDays
      : DEFAULT_ALERT_SETTINGS.awayThresholdDays;
  return {
    enabled: raw.enabled ?? DEFAULT_ALERT_SETTINGS.enabled,
    leadDays,
    geoEnabled: raw.geoEnabled ?? DEFAULT_ALERT_SETTINGS.geoEnabled,
    awayThresholdDays: threshold,
  };
}

type Bill = {
  id: string | number;
  name: string;
  amount: number;
  dueDate: string;
  riskLevel?: string | null;
};

const STORAGE_PREFIX = "bg:alert";

function alertKey(
  userId: string,
  billId: string | number,
  leadDay: number,
  dueDate: string,
) {
  return `${STORAGE_PREFIX}:${userId}:${billId}:${dueDate}:${leadDay}`;
}

function isCritical(level?: string | null) {
  return level === "critical" || level === "high";
}

function fireNotification(bill: Bill, leadDay: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const when =
    leadDay === 0
      ? "today"
      : leadDay === 1
        ? "in 24 hours"
        : `in ${leadDay} days`;
  const body = `${bill.name} · $${bill.amount.toFixed(2)} due ${when}`;
  try {
    new Notification("Kindue · Critical bill alert", {
      body,
      tag: `bg-${bill.id}-${leadDay}`,
      icon: "/favicon.ico",
    });
  } catch {
    /* ignore */
  }
}

export function useBillAlerts() {
  const { user, isLoaded } = useUser();
  const { data } = useBills();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded || !user || !data) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const settings = getAlertSettings(
      user.unsafeMetadata as Record<string, unknown>,
    );
    if (!settings.enabled) return;
    if (Notification.permission !== "granted") return;

    const bills = data as unknown as Bill[];
    if (!Array.isArray(bills)) return;

    const today = new Date();
    for (const bill of bills) {
      if (!isCritical(bill.riskLevel)) continue;
      let due: Date;
      try {
        due = parseISO(bill.dueDate);
      } catch {
        continue;
      }
      const days = differenceInCalendarDays(due, today);
      if (days < 0) continue;
      for (const lead of settings.leadDays) {
        if (days <= lead) {
          const key = alertKey(user.id, bill.id, lead, bill.dueDate);
          if (seenRef.current.has(key)) continue;
          if (typeof localStorage !== "undefined" && localStorage.getItem(key))
            continue;
          fireNotification(bill, days);
          seenRef.current.add(key);
          try {
            localStorage.setItem(key, String(Date.now()));
          } catch {
            /* ignore */
          }
          break;
        }
      }
    }
  }, [isLoaded, user, data]);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window))
    return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}
