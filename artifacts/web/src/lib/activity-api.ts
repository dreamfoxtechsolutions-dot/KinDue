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
  // ISO timestamp of when this user last opened the activity feed.
  // The real backend has no per-user "last seen" tracking yet, so this
  // is always null and the feed renders as if everything is "new". The
  // divider just won't appear.
  lastSeenAt: string | null;
  // The current user's id. Echoed back so the activity feed can mark
  // its own actions; backend doesn't return it, so callers must pass
  // it explicitly via `ListActivityParams.currentUserId`.
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
  // Active household to scope the audit query to. Required — the
  // backend has no "all my households" feed.
  householdId?: number | null;
  // The currently signed-in user's id. The audit endpoint doesn't
  // return this, so callers thread it through here so the feed can
  // distinguish "by me" from "by my co-caregivers".
  currentUserId?: string | null;
};

type AuditRowResponse = {
  id: number;
  householdId: number;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: number | string;
  details: string | null;
  createdAt: string;
};

const ACTIVE_HOUSEHOLD_KEY = "kindue:active-household-id";

function readActiveHouseholdId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function adapt(
  row: AuditRowResponse,
  meId: string,
): ActivityEntry {
  const actorEmail = row.actorUserId === meId ? "" : "";
  let link = "";
  if (row.entityType === "bill") link = `/bills/${row.entityId}`;
  else if (row.entityType === "subscription")
    link = `/subscriptions/${row.entityId}`;
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: String(row.entityId),
    summary: row.details ?? row.action,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorEmail,
    link,
    createdAt: row.createdAt,
  };
}

export const activityApi = {
  list: async (params: ListActivityParams = {}): Promise<ActivityResponse> => {
    const householdId = params.householdId ?? readActiveHouseholdId();
    const meId = params.currentUserId ?? "";
    if (householdId == null) {
      return {
        activity: [],
        nextCursor: null,
        lastSeenAt: null,
        currentUserId: meId,
        filters: { actors: [], types: [], actions: [] },
      };
    }
    const limit = params.limit ?? 50;
    // Backend has no cursor/filter support on /audit yet — we
    // overfetch and trim/filter client-side. TODO: add server-side
    // cursoring + filters and replace this.
    const rows = await customFetch<AuditRowResponse[]>(
      `/api/households/${householdId}/audit?limit=${limit + 1}`,
    ).catch(() => [] as AuditRowResponse[]);

    let filtered = rows;
    if (params.actor && params.actor !== "all") {
      filtered = filtered.filter((r) => r.actorUserId === params.actor);
    }
    if (params.type && params.type !== "all") {
      filtered = filtered.filter((r) => r.entityType === params.type);
    }
    if (params.action && params.action !== "all") {
      filtered = filtered.filter((r) => r.action === params.action);
    }
    if (params.from) {
      const fromTs = Date.parse(params.from);
      if (Number.isFinite(fromTs)) {
        filtered = filtered.filter(
          (r) => Date.parse(r.createdAt) >= fromTs,
        );
      }
    }
    if (params.to) {
      const toTs = Date.parse(params.to);
      if (Number.isFinite(toTs)) {
        filtered = filtered.filter((r) => Date.parse(r.createdAt) <= toTs);
      }
    }
    if (params.q && params.q.trim()) {
      const needle = params.q.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        (r.details ?? "").toLowerCase().includes(needle) ||
        r.action.toLowerCase().includes(needle) ||
        r.actorName.toLowerCase().includes(needle),
      );
    }

    // Build filter dropdown options from the unfiltered window so the
    // dropdowns don't collapse as the user picks values.
    const actorMap = new Map<string, ActivityActor>();
    const typeSet = new Set<string>();
    const actionSet = new Set<string>();
    for (const r of rows) {
      if (!actorMap.has(r.actorUserId)) {
        actorMap.set(r.actorUserId, {
          userId: r.actorUserId,
          name: r.actorName,
          email: "",
        });
      }
      typeSet.add(r.entityType);
      actionSet.add(r.action);
    }

    return {
      activity: filtered.slice(0, limit).map((r) => adapt(r, meId)),
      // No real cursor — backend returns a fixed-size window. Setting
      // null disables "load more" until the audit endpoint grows pagination.
      nextCursor: null,
      lastSeenAt: null,
      currentUserId: meId,
      filters: {
        actors: Array.from(actorMap.values()),
        types: Array.from(typeSet),
        actions: Array.from(actionSet),
      },
    };
  },

  // TODO: backend not implemented — no per-user "last seen" tracking
  // for the activity feed. The mutation is a no-op so the existing UI
  // (which fires it on a debounce) doesn't crash.
  markSeen: async (): Promise<void> => {
    return;
  },
};
