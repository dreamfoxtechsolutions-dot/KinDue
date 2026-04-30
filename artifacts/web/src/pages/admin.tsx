import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout";
import { GeographyTab } from "@/components/admin/GeographyTab";
import { HouseholdsTab } from "@/components/admin/HouseholdsTab";
import {
  useAdminWhoami,
  useAdminOverview,
  useAdminListErrors,
  useAdminListScans,
  useAdminSecurity,
  useAdminSendTestAlert,
  useAdminSecurityTestEvent,
  useAdminListAdmins,
  useAdminListRoles,
  useAdminCreateAdmin,
  useAdminUpdateAdmin,
  useAdminRemoveAdmin,
  getAdminOverviewQueryKey,
  getAdminListErrorsQueryKey,
  getAdminListScansQueryKey,
  getAdminSecurityQueryKey,
  getAdminListAdminsQueryKey,
  getAdminListRolesQueryKey,
  getAdminHouseholdsQueryKey,
  type AdminSecurityReport,
  type AdminSecurityEvent,
  type AdminUser,
  type AdminRole,
  type AdminPermission,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  AlertTriangle,
  Bell,
  Crown,
  Database,
  Eye,
  Fingerprint,
  Globe,
  HeartHandshake,
  Inbox,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Timer,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              {label}
            </div>
            <div className="font-mono text-2xl font-medium mt-1.5 tracking-tight">
              {value}
            </div>
            {hint && (
              <div className="text-xs text-muted-foreground mt-1">{hint}</div>
            )}
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

type SecurityReport = AdminSecurityReport;
type SecurityEvent = AdminSecurityEvent;

const POSTURE_META: Record<
  SecurityReport["postureLabel"],
  {
    label: string;
    tone: string;
    badgeClass: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  healthy: {
    label: "Healthy",
    tone: "border-foreground/20 bg-background",
    badgeClass: "bg-foreground text-background",
    description:
      "No suspicious activity detected. Authentication is functioning normally.",
    Icon: ShieldCheck,
  },
  elevated: {
    label: "Elevated",
    tone: "border-foreground/40 bg-secondary",
    badgeClass: "bg-secondary text-foreground border border-foreground/40",
    description:
      "Above-normal failed sign-in volume. Review recent events below.",
    Icon: Eye,
  },
  at_risk: {
    label: "At risk",
    tone: "border-destructive/60 bg-destructive/10",
    badgeClass: "bg-destructive/20 text-destructive border border-destructive/40",
    description:
      "Active probing or unauthorized access attempts detected. Investigate immediately.",
    Icon: Siren,
  },
  breach_suspected: {
    label: "Breach suspected",
    tone: "border-destructive bg-destructive/15",
    badgeClass: "bg-destructive text-destructive-foreground",
    description:
      "Multiple critical events detected. Treat the system as compromised until verified.",
    Icon: ShieldAlert,
  },
};

const KIND_META: Record<string, { label: string; tone: string }> = {
  auth_failure: { label: "Auth failure", tone: "secondary" },
  forbidden: { label: "Forbidden", tone: "secondary" },
  admin_denied: { label: "Admin denied", tone: "destructive" },
  suspicious_path: { label: "Suspicious path", tone: "destructive" },
  rate_limited: { label: "Rate limited", tone: "secondary" },
  csrf_blocked: { label: "CSRF blocked", tone: "destructive" },
  test: { label: "Test", tone: "outline" },
};

const ROLE_BADGE: Record<AdminRole, string> = {
  global: "bg-foreground text-background",
  security: "bg-destructive/15 text-destructive border border-destructive/30",
  monitoring: "bg-secondary text-foreground border border-foreground/30",
  read_only: "bg-background text-foreground border border-border",
};

function SecurityPosture({
  security,
  loading,
  onTestEvent,
  sendingProbe,
  canTestEvent,
}: {
  security: SecurityReport | undefined;
  loading: boolean;
  onTestEvent: () => void;
  sendingProbe: boolean;
  canTestEvent: boolean;
}) {
  if (loading || !security) {
    return <Skeleton className="h-40 w-full" />;
  }
  const meta = POSTURE_META[security.postureLabel];
  const Icon = meta.Icon;
  return (
    <Card className={`border-2 ${meta.tone}`}>
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="shrink-0 h-11 w-11 rounded-full bg-background border border-border flex items-center justify-center">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Security posture
                </span>
                <Badge className={`text-[10px] font-mono ${meta.badgeClass}`}>
                  {meta.label.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-foreground">{meta.description}</p>
              {security.postureReasons.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {security.postureReasons.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-foreground">›</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {canTestEvent && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onTestEvent}
                disabled={sendingProbe}
                className="gap-2"
              >
                <Fingerprint className="h-3.5 w-3.5" />
                {sendingProbe ? "Recording…" : "Log test event"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-border">
          <SecurityStat
            label="Failed sign-ins"
            value={security.last24h.authFailures}
          />
          <SecurityStat label="Forbidden" value={security.last24h.forbidden} />
          <SecurityStat
            label="Admin denied"
            value={security.last24h.adminDenied}
            danger={security.last24h.adminDenied > 0}
          />
          <SecurityStat
            label="Suspicious paths"
            value={security.last24h.suspiciousPaths}
            danger={security.last24h.suspiciousPaths > 0}
          />
          <SecurityStat
            label="Rate limited"
            value={security.last24h.rateLimited}
          />
          <SecurityStat
            label="Unique clients"
            value={security.last24h.uniqueClients}
          />
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Window: last 24 hours · Critical events (7d):{" "}
          <span className="font-mono text-foreground">
            {security.last7d.criticalEvents}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`font-mono text-lg ${danger ? "text-destructive" : "text-foreground"}`}
      >
        {value.toLocaleString("en-US")}
      </div>
    </div>
  );
}

function SecurityEventsTable({
  events,
  loading,
}: {
  events: SecurityEvent[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-base font-medium">
          Recent security events
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-5">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            No security events recorded. The application has not seen any
            suspicious activity.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">When</TableHead>
                  <TableHead className="w-[130px]">Kind</TableHead>
                  <TableHead className="w-[80px]">Severity</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="w-[100px]">Client</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => {
                  const km = KIND_META[e.kind] ?? {
                    label: e.kind,
                    tone: "secondary",
                  };
                  const sevTone =
                    e.severity === "critical"
                      ? "destructive"
                      : e.severity === "warn"
                        ? "secondary"
                        : "outline";
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelative(e.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (km.tone as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline") ?? "secondary"
                          }
                          className="text-[10px] font-mono"
                        >
                          {km.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sevTone}
                          className="text-[10px] font-mono uppercase"
                        >
                          {e.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.method ? `${e.method} ` : ""}
                        {e.route || "—"}
                        {e.statusCode ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {e.statusCode}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {e.ipHash ? e.ipHash.slice(0, 8) : "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[360px] truncate">
                        {e.detail || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminsTab({ currentEmail }: { currentEmail: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: admins = [], isLoading: adminsLoading } = useAdminListAdmins({
    query: { queryKey: getAdminListAdminsQueryKey() },
  });
  const { data: rolesResp } = useAdminListRoles({
    query: { queryKey: getAdminListRolesQueryKey() },
  });
  const roles = rolesResp?.roles ?? [];

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("read_only");
  const [note, setNote] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getAdminListAdminsQueryKey() });

  const create = useAdminCreateAdmin({
    mutation: {
      onSuccess: (created) => {
        toast({
          title: "Admin added",
          description: `${created.email} now has ${created.roleLabel} access.`,
        });
        setEmail("");
        setNote("");
        setRole("read_only");
        invalidate();
      },
      onError: (err: { message?: string }) =>
        toast({
          title: "Could not add admin",
          description: err?.message ?? "Unknown error",
          variant: "destructive",
        }),
    },
  });

  const update = useAdminUpdateAdmin({
    mutation: {
      onSuccess: (u) => {
        toast({
          title: "Role updated",
          description: `${u.email} is now ${u.roleLabel}.`,
        });
        invalidate();
      },
      onError: (err: { message?: string }) =>
        toast({
          title: "Could not update",
          description: err?.message ?? "Unknown error",
          variant: "destructive",
        }),
    },
  });

  const remove = useAdminRemoveAdmin({
    mutation: {
      onSuccess: () => {
        toast({ title: "Admin removed" });
        invalidate();
      },
      onError: (err: { message?: string }) =>
        toast({
          title: "Could not remove",
          description: err?.message ?? "Unknown error",
          variant: "destructive",
        }),
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    create.mutate({
      data: { email: email.trim().toLowerCase(), role, note: note.trim() },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Grant admin access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submit}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">
                Email
              </label>
              <Input
                type="email"
                placeholder="person@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-mono text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">
                Role
              </label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as AdminRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.role} value={r.role}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">
                Note (optional)
              </label>
              <Input
                placeholder="e.g. on-call engineer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="md:col-span-1">
              <Button
                type="submit"
                disabled={create.isPending || !email.trim()}
                className="w-full gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {create.isPending ? "…" : "Add"}
              </Button>
            </div>
          </form>

          {roles.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {roles.map((r) => (
                <div
                  key={r.role}
                  className="rounded-md border border-border p-3 bg-card"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge
                      className={`text-[10px] font-mono ${ROLE_BADGE[r.role]}`}
                    >
                      {r.label}
                    </Badge>
                    {r.role === "global" && (
                      <Crown className="h-3 w-3 text-foreground" />
                    )}
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Current admins ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {adminsLoading ? (
            <div className="p-5">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : admins.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">
              No admins yet. Add the first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[180px]">Role</TableHead>
                    <TableHead className="w-[160px]">Added by</TableHead>
                    <TableHead className="w-[120px]">Added</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((a: AdminUser) => {
                    const isSelf =
                      a.email.toLowerCase() === currentEmail.toLowerCase();
                    const locked = a.isEnvSeeded;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span>{a.email}</span>
                            {isSelf && (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono"
                              >
                                YOU
                              </Badge>
                            )}
                            {locked && (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono"
                                title="Configured via ADMIN_EMAILS env var"
                              >
                                ENV
                              </Badge>
                            )}
                          </div>
                          {a.note && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {a.note}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={a.role}
                            disabled={locked || update.isPending}
                            onValueChange={(v) =>
                              update.mutate({
                                id: a.id,
                                data: { role: v as AdminRole },
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (
                                <SelectItem key={r.role} value={r.role}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {a.addedByEmail || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {formatRelative(a.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={locked || isSelf || remove.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Revoke admin access for ${a.email}?`,
                                )
                              ) {
                                remove.mutate({ id: a.id });
                              }
                            }}
                            className="h-8 px-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: whoami, isLoading: whoamiLoading } = useAdminWhoami();
  const isAdmin = whoami?.isAdmin === true;
  const role = (whoami?.role ?? "read_only") as AdminRole;
  const permissions = useMemo<AdminPermission[]>(
    () => (whoami?.permissions ?? []) as AdminPermission[],
    [whoami?.permissions],
  );
  const can = (p: AdminPermission) => permissions.includes(p);

  const { data: overview, isLoading: overviewLoading } = useAdminOverview({
    query: {
      queryKey: getAdminOverviewQueryKey(),
      enabled: isAdmin && can("view_overview"),
      refetchInterval: 30_000,
    },
  });
  const { data: errors = [], isLoading: errorsLoading } = useAdminListErrors(
    { limit: 25 },
    {
      query: {
        queryKey: getAdminListErrorsQueryKey({ limit: 25 }),
        enabled: isAdmin && can("view_errors"),
        refetchInterval: 30_000,
      },
    },
  );
  const { data: scans = [], isLoading: scansLoading } = useAdminListScans(
    { limit: 25 },
    {
      query: {
        queryKey: getAdminListScansQueryKey({ limit: 25 }),
        enabled: isAdmin && can("view_scans"),
        refetchInterval: 30_000,
      },
    },
  );
  const { data: security, isLoading: securityLoading } = useAdminSecurity(
    { limit: 50 },
    {
      query: {
        queryKey: getAdminSecurityQueryKey({ limit: 50 }),
        enabled: isAdmin && can("view_security"),
        refetchInterval: 30_000,
      },
    },
  );

  const [sendingProbe, setSendingProbe] = useState(false);
  const sendProbe = useAdminSecurityTestEvent({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Test event recorded",
          description: "A synthetic security event was added for review.",
        });
        queryClient.invalidateQueries({
          queryKey: getAdminSecurityQueryKey(),
        });
      },
      onError: (err: { message?: string }) =>
        toast({
          title: "Test failed",
          description: err?.message ?? "Could not record test event",
          variant: "destructive",
        }),
      onSettled: () => setSendingProbe(false),
    },
  });

  const [sendingTest, setSendingTest] = useState(false);
  const sendTest = useAdminSendTestAlert({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: data.recipients > 0 ? "Test alert sent" : "Test logged",
          description:
            data.recipients > 0
              ? `Sent to ${data.recipients} admin recipient${data.recipients === 1 ? "" : "s"}.`
              : "ADMIN_EMAILS is not set, so no email was sent. The test was logged to the error feed.",
        });
        queryClient.invalidateQueries({ queryKey: getAdminListErrorsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getAdminOverviewQueryKey() });
      },
      onError: (err: { message?: string }) =>
        toast({
          title: "Test failed",
          description: err?.message ?? "Could not send test alert",
          variant: "destructive",
        }),
      onSettled: () => setSendingTest(false),
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getAdminOverviewQueryKey() });
    queryClient.invalidateQueries({ queryKey: getAdminListErrorsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getAdminListScansQueryKey() });
    queryClient.invalidateQueries({ queryKey: getAdminSecurityQueryKey() });
    queryClient.invalidateQueries({ queryKey: getAdminListAdminsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getAdminHouseholdsQueryKey() });
  };

  if (whoamiLoading) {
    return (
      <Layout>
        <Skeleton className="h-32 w-full" />
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Admin access required</AlertTitle>
          <AlertDescription>
            This dashboard is restricted. A global admin must grant your
            account access from the Admins tab, or your verified email must be
            listed in the{" "}
            <span className="font-mono text-foreground">ADMIN_EMAILS</span>{" "}
            environment variable.
            {whoami?.email && (
              <>
                {" "}You are signed in as{" "}
                <span className="font-mono text-foreground">
                  {whoami.email}
                </span>
                .
              </>
            )}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const tabs: Array<{
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    visible: boolean;
  }> = [
    {
      value: "security",
      label: "Security",
      icon: Lock,
      visible: can("view_security"),
    },
    {
      value: "errors",
      label: "Errors",
      icon: AlertTriangle,
      visible: can("view_errors"),
    },
    {
      value: "scans",
      label: "Scans",
      icon: RefreshCw,
      visible: can("view_scans"),
    },
    {
      value: "households",
      label: "Households",
      icon: HeartHandshake,
      visible: can("view_households"),
    },
    {
      value: "geography",
      label: "Geography",
      icon: Globe,
      visible: can("view_geography"),
    },
    {
      value: "admins",
      label: "Admins",
      icon: Users,
      visible: can("manage_admins"),
    },
  ].filter((t) => t.visible);

  const defaultTab = tabs[0]?.value ?? "security";

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Operations
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-foreground flex items-center gap-3">
              Admin overview
              <Badge
                className={`text-[10px] font-mono ${ROLE_BADGE[role]}`}
                title="Your access level"
              >
                {role === "global" && <Crown className="h-3 w-3 mr-1" />}
                {whoami?.roleLabel ?? role}
              </Badge>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Live system health, recent errors, and Gmail scan activity.
              Refreshes every 30 seconds. Signed in as{" "}
              <span className="font-mono text-foreground">{whoami?.email}</span>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={refreshAll}
              className="gap-2 h-10 px-4"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {can("trigger_test_alert") && (
              <Button
                onClick={() => {
                  setSendingTest(true);
                  sendTest.mutate();
                }}
                disabled={sendingTest}
                className="gap-2 h-10 px-4"
              >
                <Bell className="h-4 w-4" />
                {sendingTest ? "Sending…" : "Send test alert"}
              </Button>
            )}
          </div>
        </div>

        {/* Top stats */}
        {can("view_overview") &&
          (overviewLoading || !overview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  icon={<Activity className="h-4 w-4" />}
                  label="API status"
                  value={
                    <span className="text-base">
                      <span className="inline-block h-2 w-2 rounded-full bg-foreground mr-2 align-middle" />
                      Online
                    </span>
                  }
                  hint={`Uptime ${formatUptime(overview.apiUptimeSeconds)}`}
                />
                <StatCard
                  icon={<Database className="h-4 w-4" />}
                  label="Bills tracked"
                  value={overview.totals.bills.toLocaleString("en-US")}
                  hint={`+${overview.last24h.billsCreated} in last 24h`}
                />
                <StatCard
                  icon={<Inbox className="h-4 w-4" />}
                  label="Pending review"
                  value={overview.totals.pendingBills.toLocaleString("en-US")}
                  hint={`${overview.totals.subscriptions.toLocaleString("en-US")} subscriptions tracked`}
                />
                <StatCard
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Errors (24h)"
                  value={overview.last24h.errors.toLocaleString("en-US")}
                  hint={`${overview.totals.errors.toLocaleString("en-US")} all-time`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  icon={<RefreshCw className="h-4 w-4" />}
                  label="Scans (24h)"
                  value={overview.last24h.scans.toLocaleString("en-US")}
                  hint={`${overview.last24h.scansFailed} failed`}
                />
                <StatCard
                  icon={<Inbox className="h-4 w-4" />}
                  label="Bills found by scan (24h)"
                  value={overview.last24h.billsFoundByScan.toLocaleString(
                    "en-US",
                  )}
                  hint={`${overview.last24h.billsAddedByScan} newly added`}
                />
                <StatCard
                  icon={<Timer className="h-4 w-4" />}
                  label="Last error"
                  value={
                    <span className="text-sm font-sans">
                      {overview.lastError
                        ? formatRelative(overview.lastError.createdAt)
                        : "None"}
                    </span>
                  }
                  hint={
                    overview.lastError
                      ? `${overview.lastError.statusCode} ${overview.lastError.method} ${overview.lastError.route}`.slice(
                          0,
                          60,
                        )
                      : "Clean slate"
                  }
                />
                <StatCard
                  icon={<ShieldAlert className="h-4 w-4" />}
                  label="All-time scans"
                  value={overview.totals.scans.toLocaleString("en-US")}
                  hint="Includes successes and failures"
                />
              </div>

              {/* Caregiver / household summary on Overview (only when granted) */}
              {overview.totals.households !== undefined && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    icon={<HeartHandshake className="h-4 w-4" />}
                    label="Households"
                    value={(overview.totals.households ?? 0).toLocaleString(
                      "en-US",
                    )}
                    hint={`+${overview.last24h.householdsCreated ?? 0} in last 24h`}
                  />
                  <StatCard
                    icon={<Users className="h-4 w-4" />}
                    label="Active members"
                    value={(overview.totals.activeMembers ?? 0).toLocaleString(
                      "en-US",
                    )}
                    hint={`${(overview.totals.caregiverHouseholds ?? 0).toLocaleString("en-US")} caregiver households`}
                  />
                  <StatCard
                    icon={<Mail className="h-4 w-4" />}
                    label="Pending invites"
                    value={(overview.totals.pendingInvites ?? 0).toLocaleString(
                      "en-US",
                    )}
                    hint="Awaiting acceptance"
                  />
                  <StatCard
                    icon={<Activity className="h-4 w-4" />}
                    label="Audit events (24h)"
                    value={(overview.last24h.auditEvents ?? 0).toLocaleString(
                      "en-US",
                    )}
                    hint="Caregiver activity volume"
                  />
                </div>
              )}
            </>
          ))}

        {can("view_security") && (
          <SecurityPosture
            security={security}
            loading={securityLoading}
            onTestEvent={() => {
              setSendingProbe(true);
              sendProbe.mutate();
            }}
            sendingProbe={sendingProbe}
            canTestEvent={can("trigger_test_security_event")}
          />
        )}

        {tabs.length > 0 && (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList
              className="w-full sm:w-auto grid bg-sidebar border border-border"
              style={{
                gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
              }}
            >
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {can("view_security") && (
              <TabsContent value="security" className="mt-4">
                <SecurityEventsTable
                  events={security?.recent ?? []}
                  loading={securityLoading}
                />
              </TabsContent>
            )}

            {can("view_errors") && (
              <TabsContent value="errors" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif text-base font-medium">
                      Last 25 errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {errorsLoading ? (
                      <div className="p-5">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : errors.length === 0 ? (
                      <div className="p-8 text-sm text-muted-foreground text-center">
                        No errors recorded. The system has been clean.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[120px]">When</TableHead>
                              <TableHead className="w-[80px]">Status</TableHead>
                              <TableHead>Route</TableHead>
                              <TableHead>Message</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {errors.map((e) => (
                              <TableRow key={e.id}>
                                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                  {formatRelative(e.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      e.statusCode >= 500
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className="font-mono text-[10px]"
                                  >
                                    {e.statusCode}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {e.method} {e.route || "—"}
                                </TableCell>
                                <TableCell className="text-sm max-w-[420px] truncate">
                                  {e.message}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {can("view_scans") && (
              <TabsContent value="scans" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif text-base font-medium">
                      Last 25 Gmail scans
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {scansLoading ? (
                      <div className="p-5">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : scans.length === 0 ? (
                      <div className="p-8 text-sm text-muted-foreground text-center">
                        No scans yet. Run a scan from the dashboard to see
                        entries here.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[120px]">When</TableHead>
                              <TableHead className="w-[110px]">Kind</TableHead>
                              <TableHead className="w-[90px]">
                                Status
                              </TableHead>
                              <TableHead className="w-[80px] text-right">
                                Scanned
                              </TableHead>
                              <TableHead className="w-[80px] text-right">
                                Found
                              </TableHead>
                              <TableHead className="w-[80px] text-right">
                                Added
                              </TableHead>
                              <TableHead className="w-[90px] text-right">
                                Time
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scans.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                  {formatRelative(s.createdAt)}
                                </TableCell>
                                <TableCell className="text-xs uppercase tracking-wide">
                                  {s.kind}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      s.status === "success"
                                        ? "secondary"
                                        : "destructive"
                                    }
                                    className="font-mono text-[10px]"
                                  >
                                    {s.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-right">
                                  {s.scanned}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-right">
                                  {s.found}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-right">
                                  {s.newlyAdded}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-right text-muted-foreground">
                                  {s.durationMs}ms
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {can("view_households") && (
              <TabsContent value="households" className="mt-4">
                <HouseholdsTab />
              </TabsContent>
            )}

            {can("view_geography") && (
              <TabsContent value="geography" className="mt-4">
                <GeographyTab />
              </TabsContent>
            )}

            {can("manage_admins") && (
              <TabsContent value="admins" className="mt-4">
                <AdminsTab currentEmail={whoami?.email ?? ""} />
              </TabsContent>
            )}
          </Tabs>
        )}

        {can("manage_admins") && <WaitlistCard />}

        {/* Helper card */}
        <Card className="border-dashed">
          <CardContent className="p-5 text-sm text-muted-foreground">
            <p className="mb-2">
              <span className="font-medium text-foreground">Roles:</span>{" "}
              <span className="font-mono">global</span> sees and manages
              everything.{" "}
              <span className="font-mono">security</span> sees only the
              security panel.{" "}
              <span className="font-mono">monitoring</span> sees errors,
              Gmail scans, and households.{" "}
              <span className="font-mono">read_only</span> can view the entire
              dashboard but cannot trigger any action.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Email alerts:
              </span>{" "}
              5xx errors and critical security events are emailed to every
              address in{" "}
              <span className="font-mono text-foreground">ADMIN_EMAILS</span>.
              Repeats are suppressed for 10 minutes. Only global admins can
              fire test alerts.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// Marketing-page waitlist signups, surfaced to admins so we can
// size demand for Family Plus / Trusted Circle before billing
// ships. Uses a direct fetch with a Clerk token rather than the
// generated api-client, because this endpoint is small enough
// that it isn't worth regenerating the spec for.
type WaitlistEntry = {
  id: number;
  email: string;
  tier: string;
  source: string;
  createdAt: string;
};
type WaitlistResponse = {
  entries: WaitlistEntry[];
  totals: { tier: string; count: number }[];
};

const TIER_LABELS: Record<string, string> = {
  plus: "Family Plus",
  trusted_circle: "Trusted Circle",
};

function WaitlistCard() {
  const { getToken } = useAuth();
  const [data, setData] = useState<WaitlistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch("/api/admin/waitlist", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as WaitlistResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <Card data-testid="card-admin-waitlist">
      <CardHeader>
        <CardTitle className="text-base">Marketing waitlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load waitlist: {error}
          </p>
        )}
        {data && (
          <>
            <div className="flex flex-wrap gap-3">
              {(["plus", "trusted_circle"] as const).map((t) => {
                const count =
                  data.totals.find((x) => x.tier === t)?.count ?? 0;
                return (
                  <div
                    key={t}
                    className="rounded-md border border-border px-4 py-3 min-w-[160px]"
                  >
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {TIER_LABELS[t] ?? t}
                    </div>
                    <div className="font-serif text-2xl mt-1">{count}</div>
                  </div>
                );
              })}
            </div>
            {data.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No signups yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Tier</th>
                      <th className="py-2 pr-4 font-medium">Source</th>
                      <th className="py-2 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.slice(0, 50).map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-border/50 last:border-b-0"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">
                          {e.email}
                        </td>
                        <td className="py-2 pr-4">
                          {TIER_LABELS[e.tier] ?? e.tier}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {e.source || "—"}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.entries.length > 50 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing 50 of {data.entries.length} (max 200).
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
