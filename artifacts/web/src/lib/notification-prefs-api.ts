import { customFetch } from "@workspace/api-client-react";

export type NotificationChannel = "inapp" | "email" | "sms";

export type NotificationCategoryRow = {
  id: string;
  label: string;
  description: string;
};

export type ChannelInfo = { id: NotificationChannel; label: string };

export type ChannelMatrix = Record<string, Record<NotificationChannel, boolean>>;

export type ContactSettings = {
  phoneE164: string;
  phoneVerified: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  quietHoursTimezone: string;
};

export type PreferencesResponse = {
  categories: NotificationCategoryRow[];
  channels: ChannelInfo[];
  matrix: ChannelMatrix;
  defaults: ChannelMatrix;
  contact: ContactSettings;
};

export type DeliveryAttempt = {
  id: number;
  channel: NotificationChannel;
  status: "sent" | "failed" | "skipped";
  reason: string;
  target: string;
  attemptedAt: string;
};

export const notificationPrefsApi = {
  get: (): Promise<PreferencesResponse> =>
    customFetch("/api/notifications/preferences"),

  update: (
    updates: Array<{
      category: string;
      channel: NotificationChannel;
      enabled: boolean;
    }>,
  ): Promise<{ applied: number; matrix: ChannelMatrix }> =>
    customFetch("/api/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify({ updates }),
    }),

  updateContact: (patch: {
    quietHoursStart: number | null;
    quietHoursEnd: number | null;
    quietHoursTimezone: string;
  }): Promise<ContactSettings> =>
    customFetch("/api/notifications/contact", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  startPhoneVerify: (
    phone: string,
  ): Promise<{ sent: boolean; expiresAt: string; devCode?: string }> =>
    customFetch("/api/notifications/phone/verify/start", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  confirmPhoneVerify: (code: string): Promise<ContactSettings> =>
    customFetch("/api/notifications/phone/verify/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  removePhone: (): Promise<{ ok: true }> =>
    customFetch("/api/notifications/phone", { method: "DELETE" }),

  deliveries: (
    notificationId: number,
  ): Promise<{ deliveries: DeliveryAttempt[] }> =>
    customFetch(`/api/notifications/${notificationId}/deliveries`),
};
