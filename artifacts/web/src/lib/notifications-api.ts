import { customFetch } from "@workspace/api-client-react";

export type AppNotification = {
  id: number;
  kind: string;
  billId: number | null;
  title: string;
  body: string;
  link: string;
  actorName: string;
  householdId: number;
  householdName: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  unread: number;
  nextCursor: string | null;
  activeHouseholdId: number | null;
  notifications: AppNotification[];
};

export type ListNotificationsParams = {
  limit?: number;
  cursor?: string | null;
  kind?: string | null;
  household?: "active" | "all";
};

function buildListUrl(params: ListNotificationsParams = {}): string {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 50));
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.kind && params.kind !== "all") qs.set("kind", params.kind);
  if (params.household) qs.set("household", params.household);
  return `/api/notifications?${qs.toString()}`;
}

export const notificationsApi = {
  list: (limit = 50): Promise<NotificationsResponse> =>
    customFetch(buildListUrl({ limit })),
  listPage: (params: ListNotificationsParams): Promise<NotificationsResponse> =>
    customFetch(buildListUrl(params)),
  markRead: (id: number): Promise<{ updated: number }> =>
    customFetch(`/api/notifications/${id}/read`, { method: "POST" }),
  markAllRead: (
    opts: { household?: "active" | "all" } = {},
  ): Promise<{ updated: number }> => {
    const qs = opts.household ? `?household=${opts.household}` : "";
    return customFetch(`/api/notifications/read-all${qs}`, { method: "POST" });
  },
};
