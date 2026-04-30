import {
  useAdminHouseholds,
  getAdminHouseholdsQueryKey,
  type AdminHouseholds,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertOctagon,
  HeartHandshake,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Primary user",
  full: "Trustee",
  helper: "Family member",
  view_alerts: "Caregiver",
  // alerts_only is retired but legacy rows are folded into Caregiver.
  alerts_only: "Caregiver",
};

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  paid: "Marked paid",
  invited: "Invited",
  accepted: "Invite accepted",
  revoked: "Invite revoked",
  role_changed: "Role changed",
  removed: "Removed",
  scan_run: "Scan run",
  choice_set: "Onboarding set",
  claimed: "Claimed",
  released: "Released",
  comment: "Commented",
};

function StatTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "warn" | "danger";
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-destructive/50"
          : tone === "warn"
            ? "border-foreground/40"
            : ""
      }
    >
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

function pct(n: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function describeChoice(choice: string): { label: string; tone: string } {
  if (choice === "with_someone")
    return {
      label: "Partners",
      tone: "bg-foreground text-background",
    };
  if (choice === "for_someone")
    return {
      label: "Caregiver",
      tone: "bg-foreground text-background",
    };
  if (choice === "multiple")
    return {
      label: "Multi-household",
      tone: "bg-foreground text-background",
    };
  if (choice === "just_me")
    return {
      label: "Just me",
      tone: "bg-secondary text-foreground border border-border",
    };
  return {
    label: "—",
    tone: "bg-background text-muted-foreground border border-dashed",
  };
}

export function HouseholdsTab() {
  const { data, isLoading } = useAdminHouseholds(
    { limit: 25 },
    {
      query: {
        queryKey: getAdminHouseholdsQueryKey({ limit: 25 }),
        refetchInterval: 60_000,
      },
    },
  );

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const d = data as AdminHouseholds;
  const totalChoice = d.onboardingSplit.justMe + d.onboardingSplit.withSomeone;
  // Fold the retired `alerts_only` bucket into Caregiver (`view_alerts`)
  // so the admin view shows exactly the four user-facing tiers. This is
  // a presentation-only fold — the API still returns the legacy bucket so
  // we can detect un-migrated rows during the rollout.
  const caregiverCount =
    d.roleDistribution.view_alerts + d.roleDistribution.alerts_only;
  const totalRoles =
    d.roleDistribution.owner +
    d.roleDistribution.full +
    d.roleDistribution.helper +
    caregiverCount;
  const totalInvitesAll =
    d.invites.pending +
    d.invites.accepted +
    d.invites.revoked +
    d.invites.expired;

  return (
    <div className="flex flex-col gap-6">
      {/* Top stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<HeartHandshake className="h-4 w-4" />}
          label="Households"
          value={d.totals.households.toLocaleString("en-US")}
          hint={`+${d.growth.created7d} in 7d · +${d.growth.created30d} in 30d`}
        />
        <StatTile
          icon={<Users className="h-4 w-4" />}
          label="Active members"
          value={d.totals.activeMembers.toLocaleString("en-US")}
          hint={`Avg ${d.totals.avgMembersPerHousehold.toFixed(2)} per household`}
        />
        <StatTile
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Multi-member"
          value={d.totals.multiMemberHouseholds.toLocaleString("en-US")}
          hint={`${pct(d.totals.multiMemberHouseholds, d.totals.households)} of households have ≥2 members`}
        />
        <StatTile
          icon={<UserPlus className="h-4 w-4" />}
          label="Pending invites"
          value={d.invites.pending.toLocaleString("en-US")}
          hint={`${d.invites.sent7d} sent in last 7d`}
          tone={d.invites.deliveryFailed > 0 ? "warn" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<Mail className="h-4 w-4" />}
          label="Invite delivery failures"
          value={d.invites.deliveryFailed.toLocaleString("en-US")}
          hint={
            d.invites.deliveryFailed > 0
              ? "Investigate Gmail mailer"
              : "All invites delivered"
          }
          tone={d.invites.deliveryFailed > 0 ? "danger" : undefined}
        />
        <StatTile
          icon={<MessageSquare className="h-4 w-4" />}
          label="Bill comments"
          value={d.comments.total.toLocaleString("en-US")}
          hint={`${d.comments.last24h} in last 24h`}
        />
        <StatTile
          icon={<Activity className="h-4 w-4" />}
          label="Audit events (24h)"
          value={d.audit.last24h.toLocaleString("en-US")}
          hint={`${d.audit.last7d.toLocaleString("en-US")} in 7d · ${d.audit.total.toLocaleString("en-US")} total`}
        />
        <StatTile
          icon={<AlertOctagon className="h-4 w-4" />}
          label="Caregiver share"
          value={pct(d.onboardingSplit.withSomeone, totalChoice)}
          hint={`${d.onboardingSplit.withSomeone} caregiver · ${d.onboardingSplit.justMe} solo · ${d.onboardingSplit.unset} unset`}
        />
      </div>

      {/* Onboarding split + role distribution + invite pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">
              Onboarding split
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                k: "Caregiver (helping someone)",
                v: d.onboardingSplit.withSomeone,
              },
              { k: "Just me", v: d.onboardingSplit.justMe },
              { k: "Not yet asked", v: d.onboardingSplit.unset },
            ].map((row) => {
              const p = d.totals.households
                ? Math.round((row.v / d.totals.households) * 100)
                : 0;
              return (
                <div key={row.k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{row.k}</span>
                    <span className="font-mono text-muted-foreground">
                      {row.v} · {p}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded">
                    <div
                      className="h-1.5 bg-foreground rounded"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">
              Role distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["owner", "full", "helper", "view_alerts"] as const).map(
              (role) => {
                const v =
                  role === "view_alerts"
                    ? caregiverCount
                    : d.roleDistribution[role];
                const p = totalRoles
                  ? Math.round((v / totalRoles) * 100)
                  : 0;
                return (
                  <div key={role}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{ROLE_LABEL[role]}</span>
                      <span className="font-mono text-muted-foreground">
                        {v} · {p}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded">
                      <div
                        className="h-1.5 bg-foreground rounded"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">
              Invite pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["pending", "Pending"],
                ["accepted", "Accepted"],
                ["revoked", "Revoked"],
                ["expired", "Expired"],
              ] as const
            ).map(([key, label]) => {
              const v = d.invites[key];
              const p = totalInvitesAll
                ? Math.round((v / totalInvitesAll) * 100)
                : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{label}</span>
                    <span className="font-mono text-muted-foreground">
                      {v} · {p}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded">
                    <div
                      className={`h-1.5 rounded ${key === "pending" ? "bg-foreground/70" : key === "accepted" ? "bg-foreground" : "bg-muted-foreground/40"}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {d.invites.deliveryFailed > 0 && (
              <div className="text-xs text-destructive font-mono pt-1">
                ⚠ {d.invites.deliveryFailed} delivery failure
                {d.invites.deliveryFailed === 1 ? "" : "s"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top actions + most active households */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">
              Top actions (last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {d.audit.topActions7d.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center">
                No household activity yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.audit.topActions7d.map((a) => (
                    <TableRow key={a.action}>
                      <TableCell className="text-sm">
                        {ACTION_LABEL[a.action] ?? a.action}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {a.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">
              Most active households (7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {d.mostActive7d.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center">
                No household activity in the last 7 days.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[80px] text-right">
                      Members
                    </TableHead>
                    <TableHead className="w-[80px] text-right">
                      Events
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.mostActive7d.map((h) => {
                    const c = describeChoice(h.onboardingChoice);
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{h.id}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{h.name}</div>
                          {h.caregiverFor && (
                            <div className="text-xs text-muted-foreground">
                              for {h.caregiverFor}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${c.tone}`}>
                            {c.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {h.memberCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {h.eventsLast7d}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent households */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium">
            Newest households
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {d.recent.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">
              No households yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[90px] text-right">
                      Members
                    </TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.recent.map((h) => {
                    const c = describeChoice(h.onboardingChoice);
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{h.id}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{h.name}</div>
                          {h.caregiverFor && (
                            <div className="text-xs text-muted-foreground">
                              for {h.caregiverFor}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${c.tone}`}>
                            {c.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {h.memberCount}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {relative(h.createdAt)}
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

      {/* Audit feed */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium">
            Recent caregiver activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {d.auditFeed.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">
              No recent activity.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">When</TableHead>
                    <TableHead className="w-[60px]">HH</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.auditFeed.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {relative(e.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{e.householdId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px]"
                        >
                          {e.entityType}.{e.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{e.actorName || "—"}</div>
                        {e.actorEmail && (
                          <div className="text-muted-foreground font-mono">
                            {e.actorEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[420px] truncate">
                        {e.summary || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
