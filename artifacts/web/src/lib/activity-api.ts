import { customFetch } from "@workspace/api-client-react";

export type ActivityEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  link: string;
  createdAt: string;
};

export type ActivityActor = {
  userId: string;
  name: string;
  email: string;
};

export type ActivityResponse = {
  activity: ActivityEntry[];
  nextCursor: string | null;
  // ISO timestamp of when this user last opened the activity feed. Used
  // to draw the "since you were last here" divider. Null means the user
  // has never opened the feed before — everything is "new" to them.
  lastSeenAt: string | null;
  // The current user's id, echoed back so the client can reliably tell
  // "actions by me" apart from "actions by my co-caregivers" without
  // trusting the dashboard's separately-cached household state.
  currentUserId: string;
  filters: {
    actors: ActivityActor[];
    types: string[];
    actions: string[];
  };
};

export type ListActivityParams = {
  limit?: number;
  cursor?: string | null;
  actor?: string | null;
  type?: string | null;
  action?: string | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
};

function buildUrl(params: ListActivityParams = {}): string {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 50));
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.actor && params.actor !== "all") qs.set("actor", params.actor);
  if (params.type && params.type !== "all") qs.set("type", params.type);
  if (params.action && params.action !== "all") qs.set("action", params.action);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.q && params.q.trim()) qs.set("q", params.q.trim());
  return `/api/household/me/activity?${qs.toString()}`;
}

export const activityApi = {
  list: (params: ListActivityParams = {}): Promise<ActivityResponse> =>
    customFetch(buildUrl(params)),
  // Marks the activity feed as "seen up to now" for the current user.
  // Called after the feed has been on screen long enough that the user
  // has plausibly looked at it. Idempotent on the server.
  markSeen: (): Promise<void> =>
    customFetch("/api/household/me/activity/seen", {
      method: "POST",
    }),
};
