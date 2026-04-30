import { useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  householdApi,
  type HouseholdRole,
  can,
} from "@/lib/household-api";
import { HOUSEHOLD_ME_KEY, useHouseholdMe } from "@/hooks/use-household";
import {
  Users,
  ScrollText,
  AlertTriangle,
  Loader2,
  Trash2,
  Send,
  Copy,
  X,
  FolderLock,
} from "lucide-react";
import { DocumentsTab } from "@/components/documents-tab";
import { HouseholdSwitcher } from "@/components/household-switcher";

// Four user-facing roles. `owner` (Primary user) is shown only as a badge
// for the household creator — never as an invite/role-change choice (you
// can't grant someone else "Primary user"; ownership transfer is its own
// flow). `alerts_only` is retired; legacy rows fall back to "Caregiver".
const ROLE_OPTIONS: { value: HouseholdRole; label: string; desc: string }[] = [
  {
    value: "owner",
    label: "Primary user",
    desc: "Full administrative access. Manages bills, the vault, members, and all sensitive details.",
  },
  {
    value: "full",
    label: "Trustee",
    desc: "Full administrative access — same powers as the Primary user.",
  },
  {
    value: "helper",
    label: "Family member",
    desc: "Can scan email for bills, add and edit bills, mark them paid, and cancel subscriptions. Cannot delete bills, invite members, or see sensitive numbers.",
  },
  {
    value: "view_alerts",
    label: "Caregiver",
    desc: "View-only access to the bill list and reminders. Can comment and coordinate, but cannot edit, pay, or scan. Sensitive numbers stay hidden.",
  },
  {
    value: "alerts_only",
    label: "Caregiver",
    desc: "View-only access to the bill list and reminders. Can comment and coordinate, but cannot edit, pay, or scan. Sensitive numbers stay hidden.",
  },
];

// Roles offered when inviting or changing a member. Excludes `owner`
// (can't be granted by invite) and `alerts_only` (retired).
const INVITE_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (r) => r.value !== "owner" && r.value !== "alerts_only",
);

function roleBadge(role: HouseholdRole) {
  const opt = ROLE_OPTIONS.find((r) => r.value === role);
  return (
    <Badge variant={role === "owner" ? "default" : "outline"} className="text-[10px]">
      {opt?.label ?? role}
    </Badge>
  );
}

const VALID_TABS = new Set(["members", "documents", "audit"]);

export function HouseholdPage() {
  const me = useHouseholdMe();
  const data = me.data;
  const search = useSearch();
  const requestedTab = new URLSearchParams(search).get("tab") ?? "";
  // The old "invites" tab has been folded into "members"; treat any
  // legacy ?tab=invites deep links as a request for the members tab.
  const normalizedTab = requestedTab === "invites" ? "members" : requestedTab;
  const initialTab = VALID_TABS.has(normalizedTab) ? normalizedTab : "members";

  if (me.isLoading || !data) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading household…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            {data.household.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            You are signed in as{" "}
            <span className="font-medium text-foreground">{data.me.displayName}</span>{" "}
            ({data.me.roleLabel}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HouseholdSwitcher />
          <Link href="/household/escalations">
            <Button variant="outline" size="sm" className="gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Escalation rules
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-3.5 h-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2" data-testid="tab-documents">
            <FolderLock className="w-3.5 h-3.5" /> Documents
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ScrollText className="w-3.5 h-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <MembersTab />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

function MembersTab() {
  const me = useHouseholdMe();
  const data = me.data!;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canManage = can(data, "manage_members");

  const change = useMutation({
    mutationFn: (v: { userId: string; role: HouseholdRole }) =>
      householdApi.changeRole(v.userId, v.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
      toast({ title: "Role updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => householdApi.removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
      toast({ title: "Member removed" });
    },
    onError: (e: Error) =>
      toast({ title: "Remove failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Caregivers and family</CardTitle>
        <CardDescription>
          Each role controls how much someone sees and what they can do.
          Caregivers get gentle reminders and can comment without seeing
          sensitive financial detail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.members.map((m) => (
          <div
            key={m.userId}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-border rounded-md p-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{m.displayName}</span>
                {roleBadge(m.role)}
                {m.userId === data.me.userId && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    You
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{m.email}</span>
            </div>
            <div className="flex items-center gap-2">
              {canManage && m.userId !== data.me.userId && (
                <Select
                  value={m.role}
                  onValueChange={(role) =>
                    change.mutate({ userId: m.userId, role: role as HouseholdRole })
                  }
                >
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITE_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {canManage && m.userId !== data.me.userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Remove ${m.displayName} from the household?`))
                      remove.mutate(m.userId);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
    {/* Invites — folded in from the old "Invites" tab so adding and
        managing people happens in one place. */}
    <InvitesTab />
    </div>
  );
}

function InvitesTab() {
  const me = useHouseholdMe();
  const data = me.data!;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canInvite = can(data, "invite_member");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<HouseholdRole>("full");
  const [note, setNote] = useState("");

  const invitesQuery = useQuery({
    queryKey: ["household", "invites"],
    queryFn: () => householdApi.invites(),
  });

  const send = useMutation({
    mutationFn: () =>
      householdApi.createInvite({ email: email.trim(), role, note: note.trim() }),
    onSuccess: (res) => {
      invitesQuery.refetch();
      setEmail("");
      setNote("");
      toast({
        title: res.delivered ? "Invite sent" : "Invite created",
        description: res.delivered
          ? `Email sent to ${res.invite.email}.`
          : `Couldn't email yet (${res.deliveryReason ?? "unknown"}). Share the link manually.`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Invite failed", description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: (id: number) => householdApi.revokeInvite(id),
    onSuccess: () => {
      invitesQuery.refetch();
      toast({ title: "Invite revoked" });
    },
  });

  const acceptUrl = (token: string) =>
    `${window.location.origin}/billguard-ai/invite/${token}`;

  return (
    <div className="space-y-4">
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite someone</CardTitle>
            <CardDescription>
              They'll get an email with a secure acceptance link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-[1fr_180px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(r) => setRole(r as HouseholdRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITE_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-note">Personal note (optional)</Label>
              <Input
                id="invite-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mom — added you so you can see Dad's bills."
              />
            </div>
            <Button
              onClick={() => send.mutate()}
              disabled={!email.trim() || send.isPending}
              className="gap-2"
            >
              {send.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send invite
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending invites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invitesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {invitesQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          )}
          {invitesQuery.data?.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-border rounded-md p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{inv.email}</span>
                  {roleBadge(inv.role)}
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {inv.status}
                  </Badge>
                  {inv.deliveryStatus !== "sent" && inv.status === "pending" && (
                    <Badge variant="outline" className="text-[10px]">
                      delivery: {inv.deliveryStatus}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Invited by {inv.invitedByEmail} · expires{" "}
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {inv.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(acceptUrl(inv.token));
                        toast({ title: "Link copied" });
                      }}
                    >
                      <Copy className="w-3 h-3" /> Copy link
                    </Button>
                    {canInvite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revoke.mutate(inv.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTab() {
  const [, setLocation] = useLocation();
  const me = useHouseholdMe();
  const data = me.data!;
  const canSee = can(data, "view_audit");
  const audit = useQuery({
    queryKey: ["household", "audit"],
    queryFn: () => householdApi.auditLog(),
    enabled: canSee,
  });

  // Even Family / Backup Caregivers (who don't have view_audit on the
  // owner-only admin endpoint) need to see "who paid what / who
  // acknowledged what alert" — that's the entire point of co-caregiver
  // attribution. The /activity feed uses the family-visible endpoint
  // and respects per-role visibility itself, so we always offer the link.
  const fullActivityCta = (
    <div className="flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/[0.04] px-4 py-3">
      <div className="text-sm">
        <div className="font-medium">Co-caregiver activity</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          See who paid which bill and who acknowledged each alert.
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setLocation("/activity")}
        data-testid="open-activity-feed"
      >
        Open log
      </Button>
    </div>
  );

  if (!canSee) {
    return <div className="space-y-3">{fullActivityCta}</div>;
  }

  return (
    <div className="space-y-3">
    {fullActivityCta}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity (owner view)</CardTitle>
        <CardDescription>
          Most recent actions in your household, with attribution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {audit.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {audit.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        )}
        {audit.data?.map((entry) => (
          <div
            key={entry.id}
            className="flex flex-col gap-1 border-b border-border/60 last:border-b-0 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">
                <span className="font-medium">{entry.actorName || entry.actorEmail || "System"}</span>{" "}
                — {entry.summary || entry.action}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {entry.action} · {entry.entityType}
              {entry.entityId ? ` #${entry.entityId}` : ""}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
    </div>
  );
}
