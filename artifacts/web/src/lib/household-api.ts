import { customFetch } from "@workspace/api-client-react";

// HouseholdRole mirrors the backend's `householdMembersTable.role` enum
// (artifacts/api-server/src/routes/households.ts VALID_ROLES). The
// generated OpenAPI schemas expose this same set under several names
// (HouseholdMemberRole, InviteMemberBodyRole, UpdateMemberBodyRole) — we
// keep one canonical web-side alias so consumers don't have to pick.
export type HouseholdRole =
  | "primary_user"
  | "trustee"
  | "caregiver"
  | "other";

export type HouseholdPermission =
  | "view_summary"
  | "view_full"
  | "create_bill"
  | "edit_bill"
  | "delete_bill"
  | "mark_paid"
  | "comment"
  | "claim_bill"
  | "scan"
  | "invite_member"
  | "manage_members"
  | "set_choice"
  | "view_audit"
  | "view_sensitive"
  | "view_medical_legal_docs"
  | "upload_doc";

// Lightweight web-side derivation of permissions from role. The real
// backend doesn't expose a permission list — it gates each endpoint
// individually using `getMemberRole(...)` + `canManageMembers(...)`.
// Until a server-side permission catalog ships, this mirror is what
// the UI uses to decide whether to *show* an action; the server is
// still the source of truth for whether the call succeeds.
const ROLE_PERMS: Record<HouseholdRole, HouseholdPermission[]> = {
  primary_user: [
    "view_summary",
    "view_full",
    "create_bill",
    "edit_bill",
    "delete_bill",
    "mark_paid",
    "comment",
    "claim_bill",
    "scan",
    "invite_member",
    "manage_members",
    "set_choice",
    "view_audit",
    "view_sensitive",
    "view_medical_legal_docs",
    "upload_doc",
  ],
  trustee: [
    "view_summary",
    "view_full",
    "create_bill",
    "edit_bill",
    "mark_paid",
    "comment",
    "claim_bill",
    "scan",
    "invite_member",
    "manage_members",
    "set_choice",
    "view_audit",
    "view_sensitive",
    "view_medical_legal_docs",
    "upload_doc",
  ],
  caregiver: [
    "view_summary",
    "view_full",
    "create_bill",
    "edit_bill",
    "mark_paid",
    "comment",
    "claim_bill",
    "scan",
    "view_audit",
    "view_sensitive",
    "upload_doc",
  ],
  other: ["view_summary", "comment"],
};

export type HouseholdMember = {
  id: number;
  userId: string;
  email: string;
  displayName: string;
  role: HouseholdRole;
  roleLabel: string;
  active: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  proxyAcknowledgedAt: string | null;
  lastVisitedCaregiverAt: string | null;
  visitSnoozedUntil: string | null;
  firstRunCompletedAt: string | null;
};

export type HouseholdInvite = {
  id: number;
  email: string;
  role: HouseholdRole;
  roleLabel: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  deliveryStatus: string;
  invitedByEmail: string;
  note: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  token: string;
};

export type HouseholdSummary = {
  id: number;
  name: string;
  role: HouseholdRole;
  roleLabel: string;
  caregiverFor: string;
  memberCount: number;
  isActive: boolean;
};

export type HouseholdMe = {
  household: {
    id: number;
    name: string;
    onboardingChoice: string;
    caregiverFor: string;
    caregiverPhone: string;
    caregiverHomeLat: number | null;
    caregiverHomeLng: number | null;
    caregiverHomeLabel: string;
    rolesRefinedAt: string | null;
    createdAt: string;
    redactedFields?: string[];
  };
  me: {
    userId: string;
    email: string;
    displayName: string;
    role: HouseholdRole;
    roleLabel: string;
    permissions: HouseholdPermission[];
  };
  members: HouseholdMember[];
  households: HouseholdSummary[];
  onboardingNeeded: boolean;
  summary: {
    total: number;
    overdue: number;
    dueSoon: number;
    shutoffRisk: number;
  } | null;
};

export type AuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorEmail: string;
  actorName: string;
  createdAt: string;
};

export type BillCommentsResponse = {
  bill: { id: number; claimedByUserId: string; claimedByName: string };
  comments: Array<{
    id: number;
    authorUserId: string;
    authorName: string;
    authorEmail: string;
    body: string;
    kind: string;
    createdAt: string;
  }>;
};

export type InvitePreview = {
  invite: HouseholdInvite;
  household: { id: number; name: string } | null;
  expired: boolean;
};

export const DOCUMENT_CATEGORIES = [
  "POA",
  "Insurance",
  "Medical",
  "Legal",
  "ID",
  "Other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type HouseholdDocument = {
  id: number;
  title: string;
  category: DocumentCategory | string;
  notes: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  expiresAt: string | null;
  belongsToUserId: string;
  uploadedByName: string;
  createdAt: string;
  canDownload: boolean;
};

export type DigestCadence = "off" | "daily" | "weekly";

export type DigestMemberPrefs = {
  cadence: DigestCadence;
  hourLocal: number;
  timezone: string;
  unsubscribed: boolean;
  lastSentAt?: string | null;
};

export type DigestDefaults = {
  cadence: DigestCadence;
  hourLocal: number;
  timezone: string;
};

export type DigestPreferencesResponse = {
  member: DigestMemberPrefs;
  defaults: DigestDefaults;
  canEditDefaults: boolean;
};

const ROLE_LABELS: Record<HouseholdRole, string> = {
  primary_user: "Primary user",
  trustee: "Trustee",
  caregiver: "Caregiver",
  other: "Other",
};

function roleLabel(role: HouseholdRole): string {
  return ROLE_LABELS[role] ?? role;
}

function permsFor(role: HouseholdRole | undefined): HouseholdPermission[] {
  if (!role) return [];
  return ROLE_PERMS[role] ?? [];
}

// ----- Server response shapes (subset we consume) ------------------------

type MeResponse = {
  id: string;
  clerkUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type HouseholdSummaryResponse = {
  id: number;
  name: string;
  address?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  role: HouseholdRole;
  memberCount: number;
};

type HouseholdDetailResponse = {
  id: number;
  name: string;
  address?: string | null;
  createdAt: string;
};

type MemberResponse = {
  id: number;
  householdId: number;
  userId: string | null;
  role: HouseholdRole;
  inviteEmail: string | null;
  inviteStatus: "pending" | "accepted";
  displayName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
};

type DashboardResponse = {
  householdId: number;
  householdName: string;
  totalBills: number;
  overdueCount: number;
  dueSoonCount: number;
  pendingApprovalCount: number;
  totalMonthlyBills: number;
  totalMonthlyEstimate: number;
  hasLowBalanceRisk: boolean;
  topTriageItems: unknown[];
  memberCount: number;
  riskScore: number;
  recentActivity: unknown[];
  userRole: HouseholdRole;
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

// ----- Real API client ---------------------------------------------------

async function fetchMe(): Promise<MeResponse> {
  return customFetch<MeResponse>("/api/me");
}

async function fetchHouseholds(): Promise<HouseholdSummaryResponse[]> {
  return customFetch<HouseholdSummaryResponse[]>("/api/households");
}

async function fetchHouseholdDetail(
  householdId: number,
): Promise<HouseholdDetailResponse> {
  return customFetch<HouseholdDetailResponse>(`/api/households/${householdId}`);
}

async function fetchMembers(householdId: number): Promise<MemberResponse[]> {
  return customFetch<MemberResponse[]>(
    `/api/households/${householdId}/members`,
  );
}

async function fetchDashboard(
  householdId: number,
): Promise<DashboardResponse> {
  return customFetch<DashboardResponse>(
    `/api/households/${householdId}/dashboard`,
  );
}

async function fetchAudit(
  householdId: number,
  limit = 100,
): Promise<AuditRowResponse[]> {
  return customFetch<AuditRowResponse[]>(
    `/api/households/${householdId}/audit?limit=${limit}`,
  );
}

function adaptMember(
  m: MemberResponse,
  meUserId: string,
): HouseholdMember {
  return {
    id: m.id,
    userId: m.userId ?? "",
    email: m.email,
    displayName: m.displayName,
    role: m.role,
    roleLabel: roleLabel(m.role),
    active: m.userId != null && m.inviteStatus !== "pending",
    createdAt: m.joinedAt,
    lastActiveAt: m.userId === meUserId ? new Date().toISOString() : null,
    proxyAcknowledgedAt: null,
    lastVisitedCaregiverAt: null,
    visitSnoozedUntil: null,
    firstRunCompletedAt: null,
  };
}

function adaptAudit(row: AuditRowResponse): AuditEntry {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: String(row.entityId),
    summary: row.details ?? row.action,
    actorEmail: "",
    actorName: row.actorName,
    createdAt: row.createdAt,
  };
}

// Client-side mirror of the active household. Reading happens here so
// that legacy callers of `householdApi.me()` (no args) keep working
// even though the real backend has no server-side "active household"
// concept. The active-household React context is the source of truth
// for the rest of the app; this just lets `householdApi` see it.
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

function writeActiveHouseholdId(id: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id == null) window.localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
    else window.localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, String(id));
  } catch {
    /* ignore */
  }
}

export const householdApi = {
  // Composes `GET /me` + `GET /households` (+ active household's
  // `/members` and `/dashboard`) into the legacy HouseholdMe shape.
  // Returns `onboardingNeeded: true` when the user has zero memberships.
  me: async (
    activeHouseholdIdOverride?: number | null,
  ): Promise<HouseholdMe> => {
    const [me, households] = await Promise.all([
      fetchMe(),
      fetchHouseholds(),
    ]);

    const summaries: HouseholdSummary[] = households.map((h) => ({
      id: h.id,
      name: h.name,
      role: h.role,
      roleLabel: roleLabel(h.role),
      caregiverFor: "",
      memberCount: h.memberCount ?? 0,
      isActive: false,
    }));

    if (households.length === 0) {
      return {
        household: {
          id: 0,
          name: "",
          onboardingChoice: "",
          caregiverFor: "",
          caregiverPhone: "",
          caregiverHomeLat: null,
          caregiverHomeLng: null,
          caregiverHomeLabel: "",
          rolesRefinedAt: null,
          createdAt: new Date().toISOString(),
        },
        me: {
          userId: me.id,
          email: me.email,
          displayName: me.displayName,
          role: "other",
          roleLabel: roleLabel("other"),
          permissions: [],
        },
        members: [],
        households: [],
        onboardingNeeded: true,
        summary: null,
      };
    }

    const requestedId =
      activeHouseholdIdOverride ?? readActiveHouseholdId();
    const activeId =
      requestedId != null && households.some((h) => h.id === requestedId)
        ? requestedId
        : households[0]!.id;
    if (activeId !== requestedId) writeActiveHouseholdId(activeId);

    const activeMembership = households.find((h) => h.id === activeId)!;
    const myRole = activeMembership.role;

    const [household, members, dashboard] = await Promise.all([
      fetchHouseholdDetail(activeId),
      fetchMembers(activeId),
      fetchDashboard(activeId).catch(() => null),
    ]);

    const adaptedMembers = members.map((m) => adaptMember(m, me.id));
    summaries.forEach((s) => {
      s.isActive = s.id === activeId;
    });

    return {
      household: {
        id: household.id,
        name: household.name,
        onboardingChoice: "",
        caregiverFor: "",
        caregiverPhone: "",
        caregiverHomeLat: null,
        caregiverHomeLng: null,
        caregiverHomeLabel: household.address ?? "",
        rolesRefinedAt: null,
        createdAt: household.createdAt,
      },
      me: {
        userId: me.id,
        email: me.email,
        displayName: me.displayName,
        role: myRole,
        roleLabel: roleLabel(myRole),
        permissions: permsFor(myRole),
      },
      members: adaptedMembers,
      households: summaries,
      onboardingNeeded: false,
      summary: dashboard
        ? {
            total: dashboard.totalBills,
            overdue: dashboard.overdueCount,
            dueSoon: dashboard.dueSoonCount,
            shutoffRisk: 0,
          }
        : null,
    };
  },

  createHousehold: async (body: {
    name: string;
    caregiverFor?: string;
  }): Promise<{
    household: {
      id: number;
      name: string;
      caregiverFor: string;
      onboardingChoice: string;
      createdAt: string;
    };
    activeHouseholdId: number;
  }> => {
    const created = await customFetch<HouseholdDetailResponse>("/api/households", {
      method: "POST",
      body: JSON.stringify({ name: body.name }),
    });
    writeActiveHouseholdId(created.id);
    return {
      household: {
        id: created.id,
        name: created.name,
        caregiverFor: body.caregiverFor ?? "",
        onboardingChoice: "",
        createdAt: created.createdAt,
      },
      activeHouseholdId: created.id,
    };
  },

  // Client-only: there is no server-side "active household" — switching
  // is just a localStorage write. Callers should also invalidate
  // household-scoped queries after this resolves.
  switchHousehold: async (
    householdId: number,
  ): Promise<{ activeHouseholdId: number }> => {
    writeActiveHouseholdId(householdId);
    return { activeHouseholdId: householdId };
  },

  changeRole: async (
    userId: string,
    role: HouseholdRole,
  ): Promise<HouseholdMember> => {
    const householdId = readActiveHouseholdId();
    if (householdId == null) throw new Error("No active household");
    const members = await fetchMembers(householdId);
    const target = members.find((m) => m.userId === userId);
    if (!target) throw new Error("Member not found");
    const updated = await customFetch<MemberResponse>(
      `/api/households/${householdId}/members/${target.id}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
    );
    return adaptMember(updated, userId);
  },

  removeMember: async (userId: string): Promise<void> => {
    const householdId = readActiveHouseholdId();
    if (householdId == null) throw new Error("No active household");
    const members = await fetchMembers(householdId);
    const target = members.find((m) => m.userId === userId);
    if (!target) throw new Error("Member not found");
    await customFetch<void>(
      `/api/households/${householdId}/members/${target.id}`,
      { method: "DELETE" },
    );
  },

  auditLog: async (limit = 100): Promise<AuditEntry[]> => {
    const householdId = readActiveHouseholdId();
    if (householdId == null) return [];
    const rows = await fetchAudit(householdId, limit);
    return rows.map(adaptAudit);
  },

  // ---------------------------------------------------------------------
  // Stubs — TODO: backend not implemented. Each rejects at call time so
  // the UI can keep its module-level imports without crashing on load.
  // ---------------------------------------------------------------------

  // TODO: backend not implemented — no `/onboarding` endpoint.
  setOnboarding: async (_body: {
    choice: "just_me" | "with_someone" | "for_someone" | "multiple";
    caregiverFor?: string;
    householdName?: string;
  }): Promise<{ household: HouseholdMe["household"] }> => {
    throw new Error("Onboarding flow is not available yet.");
  },

  // TODO: backend not implemented — no `/roles-refined` endpoint.
  markRolesRefined: async (): Promise<{ rolesRefinedAt: string }> => {
    throw new Error("Role refinement is not available yet.");
  },

  // TODO: backend not implemented — no `/proxy-acknowledge` endpoint.
  acknowledgeProxy: async (): Promise<{ proxyAcknowledgedAt: string }> => {
    throw new Error("Proxy acknowledgement is not available yet.");
  },

  // TODO: backend not implemented — no `/first-run-complete` endpoint.
  markFirstRunComplete: async (): Promise<{ firstRunCompletedAt: string }> => {
    throw new Error("First-run flow is not available yet.");
  },

  // TODO: backend not implemented — no `/caregiver-presence` endpoint.
  updateCaregiverPresence: async (_body: {
    phone?: string;
    homeLat?: number;
    homeLng?: number;
    homeLabel?: string;
    clear?: boolean;
  }): Promise<{
    household: {
      caregiverPhone: string;
      caregiverHomeLat: number | null;
      caregiverHomeLng: number | null;
      caregiverHomeLabel: string;
    };
  }> => {
    throw new Error("Caregiver presence is not available yet.");
  },

  // TODO: backend not implemented — no `/wellness-checkin` endpoint.
  recordWellnessCheckin: async (_body: {
    kind: "visited" | "snoozed";
    snoozeDays?: number;
  }): Promise<{
    lastVisitedCaregiverAt: string | null;
    visitSnoozedUntil: string | null;
  }> => {
    throw new Error("Wellness check-in is not available yet.");
  },

  // TODO: backend not implemented — no `/invites` listing endpoint.
  invites: async (): Promise<HouseholdInvite[]> => [],

  // TODO: backend not implemented — invites are issued by `POST
  // /households/:id/members` today, but there's no token / accept-url
  // returned, so legacy invite consumers can't actually function.
  createInvite: async (_body: {
    email: string;
    role: HouseholdRole;
    note?: string;
  }): Promise<{
    invite: HouseholdInvite;
    acceptUrl: string;
    delivered: boolean;
    deliveryReason: string | null;
  }> => {
    throw new Error("Invite creation is not available yet.");
  },

  // TODO: backend not implemented — no DELETE invite endpoint.
  revokeInvite: async (_id: number): Promise<void> => {
    throw new Error("Invite revocation is not available yet.");
  },

  // TODO: backend not implemented — no `/invites/:token` preview.
  invitePreview: async (_token: string): Promise<InvitePreview> => {
    throw new Error("Invite preview is not available yet.");
  },

  // TODO: backend not implemented — no `/invites/:token/accept`.
  acceptInvite: async (
    _token: string,
  ): Promise<{ householdId: number; role: HouseholdRole }> => {
    throw new Error("Invite acceptance is not available yet.");
  },

  // TODO: backend not implemented — no `/bills/:id/comments`.
  billComments: async (_billId: number): Promise<BillCommentsResponse> => {
    throw new Error("Bill comments are not available yet.");
  },

  // TODO: backend not implemented — no `/bills/:id/comments` POST.
  postComment: async (_billId: number, _body: string) => {
    throw new Error("Bill comments are not available yet.");
  },

  // TODO: backend not implemented — no `/bills/:id/claim`.
  claimBill: async (_billId: number, _release = false) => {
    throw new Error("Bill claiming is not available yet.");
  },

  // TODO: backend not implemented — no `/bills/:id/claim` reassign mode.
  reassignBill: async (_billId: number, _assignToUserId: string) => {
    throw new Error("Bill reassignment is not available yet.");
  },

  // TODO: backend not implemented — no `/digest-preferences`.
  digestPreferences: async (): Promise<DigestPreferencesResponse> => {
    throw new Error("Digest preferences are not available yet.");
  },
  updateDigestPreferences: async (
    _body: Partial<{
      cadence: DigestCadence;
      hourLocal: number;
      timezone: string;
    }>,
  ): Promise<{ member: DigestMemberPrefs }> => {
    throw new Error("Digest preferences are not available yet.");
  },
  updateDigestDefaults: async (
    _body: Partial<{
      cadence: DigestCadence;
      hourLocal: number;
      timezone: string;
    }>,
  ): Promise<{ defaults: DigestDefaults }> => {
    throw new Error("Digest defaults are not available yet.");
  },

  // TODO: backend doesn't expose granular purge — `DELETE /households/:id`
  // is the closest and only the primary user can do it. We map the
  // legacy "purge data" call to a household delete; the confirm string
  // protects the destructive intent. Counts/total are best-effort
  // because the real endpoint returns 204.
  purgeHouseholdData: async (
    confirm: string,
  ): Promise<{
    ok: boolean;
    counts: Record<string, number>;
    total: number;
  }> => {
    if (confirm.trim().toLowerCase() !== "delete") {
      throw new Error("Type DELETE to confirm.");
    }
    const householdId = readActiveHouseholdId();
    if (householdId == null) throw new Error("No active household");
    await customFetch<void>(`/api/households/${householdId}`, {
      method: "DELETE",
    });
    writeActiveHouseholdId(null);
    return { ok: true, counts: {}, total: 0 };
  },

  // TODO: backend supports `GET/POST /households/:id/documents` but not
  // the full grants / presigned-upload / preview surface the legacy UI
  // expects. We expose a thin list-only adapter; mutations stub.
  listDocuments: async (_params?: {
    q?: string;
    category?: string;
    expiringInDays?: number;
  }): Promise<{
    documents: HouseholdDocument[];
    role: HouseholdRole;
  }> => {
    const householdId = readActiveHouseholdId();
    if (householdId == null) return { documents: [], role: "other" };
    const docs = await customFetch<HouseholdDocument[]>(
      `/api/households/${householdId}/documents`,
    ).catch(() => [] as HouseholdDocument[]);
    return { documents: docs, role: "other" };
  },

  // TODO: backend not implemented — no presigned-upload endpoint.
  requestDocumentUpload: async (_body: {
    fileName: string;
    contentType: string;
    size: number;
  }): Promise<{ uploadURL: string; objectPath: string; uploadToken: string }> => {
    throw new Error("Document upload is not available yet.");
  },

  // TODO: backend has POST /documents but body shape differs and we
  // don't have an upload-token flow yet.
  createDocument: async (_body: {
    title: string;
    category: string;
    notes: string;
    objectPath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    expiresAt: string | null;
    belongsToUserId: string;
    uploadToken: string;
  }): Promise<{ document: HouseholdDocument }> => {
    throw new Error("Document creation is not available yet.");
  },

  // TODO: backend has no PATCH/PUT /documents/:id.
  updateDocument: async (
    _id: number,
    _body: Partial<{
      title: string;
      category: string;
      notes: string;
      expiresAt: string | null;
      belongsToUserId: string;
    }>,
  ): Promise<{ document: HouseholdDocument }> => {
    throw new Error("Document edits are not available yet.");
  },

  // Backend has DELETE /households/:id/documents/:documentId.
  deleteDocument: async (id: number): Promise<void> => {
    const householdId = readActiveHouseholdId();
    if (householdId == null) throw new Error("No active household");
    await customFetch<void>(
      `/api/households/${householdId}/documents/${id}`,
      { method: "DELETE" },
    );
  },

  // TODO: backend not implemented — no separate download / preview
  // endpoint. Returning empty strings so consumers don't accidentally
  // trigger a navigation.
  documentDownloadUrl: (_id: number): string => "",
  documentPreviewUrl: (_id: number): string => "",

  // TODO: backend not implemented — no document grants surface.
  documentGrants: async (_id: number): Promise<{ userIds: string[] }> => ({
    userIds: [],
  }),
  setDocumentGrants: async (
    _id: number,
    _userIds: string[],
  ): Promise<{ ok: boolean; granted: string[] }> => {
    throw new Error("Document sharing is not available yet.");
  },
};

export function can(
  me: HouseholdMe | null | undefined,
  perm: HouseholdPermission,
): boolean {
  return !!me?.me.permissions.includes(perm);
}
