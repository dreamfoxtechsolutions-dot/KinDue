import { customFetch, HouseholdRole } from "@workspace/api-client-react";

export { HouseholdRole };

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

export const householdApi = {
  me: (): Promise<HouseholdMe> => customFetch("/api/household/me"),
  setOnboarding: (body: {
    choice: "just_me" | "with_someone" | "for_someone" | "multiple";
    caregiverFor?: string;
    householdName?: string;
  }): Promise<{ household: HouseholdMe["household"] }> =>
    customFetch("/api/household/me/onboarding", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  markRolesRefined: (): Promise<{ rolesRefinedAt: string }> =>
    customFetch("/api/household/me/roles-refined", { method: "POST" }),
  acknowledgeProxy: (): Promise<{ proxyAcknowledgedAt: string }> =>
    customFetch("/api/household/me/proxy-acknowledge", { method: "POST" }),
  markFirstRunComplete: (): Promise<{ firstRunCompletedAt: string }> =>
    customFetch("/api/household/me/first-run-complete", { method: "POST" }),
  updateCaregiverPresence: (body: {
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
  }> =>
    customFetch("/api/household/me/caregiver-presence", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  recordWellnessCheckin: (body: {
    kind: "visited" | "snoozed";
    snoozeDays?: number;
  }): Promise<{
    lastVisitedCaregiverAt: string | null;
    visitSnoozedUntil: string | null;
  }> =>
    customFetch("/api/household/me/wellness-checkin", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  invites: (): Promise<HouseholdInvite[]> =>
    customFetch("/api/household/me/invites"),
  createInvite: (body: {
    email: string;
    role: HouseholdRole;
    note?: string;
  }): Promise<{
    invite: HouseholdInvite;
    acceptUrl: string;
    delivered: boolean;
    deliveryReason: string | null;
  }> =>
    customFetch("/api/household/me/invites", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeInvite: (id: number): Promise<void> =>
    customFetch(`/api/household/me/invites/${id}`, { method: "DELETE" }),
  changeRole: (
    userId: string,
    role: HouseholdRole,
  ): Promise<HouseholdMember> =>
    customFetch(`/api/household/me/members/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  removeMember: (userId: string): Promise<void> =>
    customFetch(`/api/household/me/members/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  auditLog: (limit = 100): Promise<AuditEntry[]> =>
    customFetch(`/api/household/me/audit-log?limit=${limit}`),
  invitePreview: (token: string): Promise<InvitePreview> =>
    customFetch(`/api/invites/${encodeURIComponent(token)}`),
  acceptInvite: (
    token: string,
  ): Promise<{ householdId: number; role: HouseholdRole }> =>
    customFetch(`/api/invites/${encodeURIComponent(token)}/accept`, {
      method: "POST",
    }),
  billComments: (billId: number): Promise<BillCommentsResponse> =>
    customFetch(`/api/bills/${billId}/comments`),
  postComment: (billId: number, body: string) =>
    customFetch(`/api/bills/${billId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  claimBill: (billId: number, release = false) =>
    customFetch<{
      id: number;
      claimedByUserId: string;
      claimedByName: string;
    }>(`/api/bills/${billId}/claim`, {
      method: "POST",
      body: JSON.stringify({ release }),
    }),
  digestPreferences: (): Promise<DigestPreferencesResponse> =>
    customFetch("/api/household/me/digest-preferences"),
  updateDigestPreferences: (
    body: Partial<{ cadence: DigestCadence; hourLocal: number; timezone: string }>,
  ): Promise<{ member: DigestMemberPrefs }> =>
    customFetch("/api/household/me/digest-preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateDigestDefaults: (
    body: Partial<{ cadence: DigestCadence; hourLocal: number; timezone: string }>,
  ): Promise<{ defaults: DigestDefaults }> =>
    customFetch("/api/household/me/digest-defaults", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  purgeHouseholdData: (
    confirm: string,
  ): Promise<{
    ok: boolean;
    counts: Record<string, number>;
    total: number;
  }> =>
    customFetch("/api/household/me/data/purge", {
      method: "POST",
      body: JSON.stringify({ confirm }),
    }),
  switchHousehold: (householdId: number): Promise<{ activeHouseholdId: number }> =>
    customFetch("/api/household/me/active", {
      method: "POST",
      body: JSON.stringify({ householdId }),
    }),
  createHousehold: (body: {
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
  }> =>
    customFetch("/api/household", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listDocuments: (params?: {
    q?: string;
    category?: string;
    expiringInDays?: number;
  }): Promise<{
    documents: HouseholdDocument[];
    role: HouseholdRole;
  }> => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.category) search.set("category", params.category);
    if (params?.expiringInDays)
      search.set("expiringInDays", String(params.expiringInDays));
    const qs = search.toString();
    return customFetch(
      `/api/household/me/documents${qs ? `?${qs}` : ""}`,
    );
  },
  requestDocumentUpload: (body: {
    fileName: string;
    contentType: string;
    size: number;
  }): Promise<{ uploadURL: string; objectPath: string; uploadToken: string }> =>
    customFetch("/api/household/me/documents/upload-url", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createDocument: (body: {
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
  }): Promise<{ document: HouseholdDocument }> =>
    customFetch("/api/household/me/documents", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateDocument: (
    id: number,
    body: Partial<{
      title: string;
      category: string;
      notes: string;
      expiresAt: string | null;
      belongsToUserId: string;
    }>,
  ): Promise<{ document: HouseholdDocument }> =>
    customFetch(`/api/household/me/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteDocument: (id: number): Promise<void> =>
    customFetch(`/api/household/me/documents/${id}`, { method: "DELETE" }),
  documentDownloadUrl: (id: number): string =>
    `/api/household/me/documents/${id}/download`,
  documentPreviewUrl: (id: number): string =>
    `/api/household/me/documents/${id}/preview`,
  documentGrants: (id: number): Promise<{ userIds: string[] }> =>
    customFetch(`/api/household/me/documents/${id}/grants`),
  setDocumentGrants: (
    id: number,
    userIds: string[],
  ): Promise<{ ok: boolean; granted: string[] }> =>
    customFetch(`/api/household/me/documents/${id}/grants`, {
      method: "PUT",
      body: JSON.stringify({ userIds }),
    }),
  reassignBill: (billId: number, assignToUserId: string) =>
    customFetch<{
      id: number;
      claimedByUserId: string;
      claimedByName: string;
    }>(`/api/bills/${billId}/claim`, {
      method: "POST",
      body: JSON.stringify({ assignToUserId }),
    }),
};

export function can(
  me: HouseholdMe | null | undefined,
  perm: HouseholdPermission,
): boolean {
  return !!me?.me.permissions.includes(perm);
}
