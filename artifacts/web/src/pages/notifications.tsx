import { useMemo, useState } from "react";
import { useLocation, Link as RouterLink } from "wouter";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft, Check, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  notificationsApi,
  type AppNotification,
  type NotificationsResponse,
} from "@/lib/notifications-api";
import {
  notificationPrefsApi,
  type DeliveryAttempt,
} from "@/lib/notification-prefs-api";

const PAGE_SIZE = 50;

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All notifications" },
  { value: "bill_reassigned", label: "Reassignments" },
  { value: "comment", label: "Comments" },
  { value: "claim", label: "Claims" },
  { value: "release", label: "Releases" },
];

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function kindLabel(kind: string): string {
  const found = KIND_OPTIONS.find((k) => k.value === kind);
  if (found) return found.label;
  return kind.replace(/_/g, " ");
}

export function NotificationsPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [kind, setKind] = useState<string>("all");
  const [scope, setScope] = useState<"active" | "all">("active");

  const queryKey = useMemo(
    () => ["notifications", "page", kind, scope] as const,
    [kind, scope],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<NotificationsResponse, Error>({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      notificationsApi.listPage({
        limit: PAGE_SIZE,
        cursor: (pageParam as string | null) ?? null,
        kind,
        household: scope,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    // Mirror the page's current scope so "Mark all read" only clears the
    // notifications the user is actually looking at.
    mutationFn: () => notificationsApi.markAllRead({ household: scope }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items: AppNotification[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.notifications),
    [data],
  );
  const unread = data?.pages?.[0]?.unread ?? 0;
  const activeHouseholdId = data?.pages?.[0]?.activeHouseholdId ?? null;

  const handleClick = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.link) setLocation(n.link);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-3xl">
        <RouterLink href="/">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </RouterLink>

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Activity
            </div>
            <h1 className="font-serif text-3xl font-medium tracking-tight">
              All notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-prose">
              Every alert from Kindue, in one place. Use the filter to
              narrow down by type.
            </p>
          </div>
          {unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-2"
              data-testid="mark-all-read-page"
            >
              <Check className="h-4 w-4" />
              Mark all read ({unread})
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Filter
          </span>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger
              className="w-[240px]"
              data-testid="notifications-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={scope}
            onValueChange={(v) => setScope(v as "active" | "all")}
          >
            <SelectTrigger
              className="w-[220px]"
              data-testid="notifications-scope"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active household only</SelectItem>
              <SelectItem value="all">All my households</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <section
          className="rounded-md border border-border bg-card overflow-hidden"
          data-testid="notifications-list"
        >
          {isLoading ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : isError ? (
            <div className="px-4 py-12 text-center text-sm text-destructive">
              Couldn't load notifications
              {error?.message ? `: ${error.message}` : "."}{" "}
              <Button
                variant="link"
                size="sm"
                className="px-1"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
              <Bell className="h-6 w-6 text-muted-foreground/60" />
              <span>You're all caught up.</span>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  activeHouseholdId={activeHouseholdId}
                  onClick={handleClick}
                />
              ))}
            </ul>
          )}
        </section>

        {items.length > 0 ? (
          <div className="flex justify-center pb-4">
            {hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="load-more-notifications"
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            ) : (
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                End of history
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

function channelLabel(c: string): string {
  if (c === "inapp") return "In-app";
  if (c === "email") return "Email";
  if (c === "sms") return "SMS";
  return c;
}

function reasonLabel(reason: string, status: string): string {
  if (status === "sent") {
    return reason === "deferred_send" ? "Sent after quiet hours" : "Delivered";
  }
  if (status === "skipped") {
    if (reason === "pref_off") return "Off in your preferences";
    if (reason === "no_email") return "No email on file";
    if (reason === "no_phone") return "No verified phone";
    if (reason === "phone_unverified") return "Phone not verified";
    if (reason === "quiet_hours") return "Within your quiet hours";
    return "Skipped";
  }
  return reason || "Failed to send";
}

function NotificationRow({
  n,
  activeHouseholdId,
  onClick,
}: {
  n: AppNotification;
  activeHouseholdId: number | null;
  onClick: (n: AppNotification) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["notification-deliveries", n.id],
    queryFn: () => notificationPrefsApi.deliveries(n.id),
    enabled: open,
    staleTime: 60_000,
  });
  return (
    <li>
      <div
        className={cn(
          "px-5 py-4 hover:bg-muted/60 transition-colors flex gap-3 items-start",
          !n.readAt && "bg-muted/30",
        )}
        data-testid={`notification-row-${n.id}`}
      >
        <button
          type="button"
          onClick={() => onClick(n)}
          className="flex gap-3 items-start flex-1 min-w-0 text-left"
        >
          <span
            className={cn(
              "mt-1.5 h-2 w-2 rounded-full shrink-0",
              n.readAt ? "bg-transparent" : "bg-primary",
            )}
            aria-hidden
          />
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm leading-snug">
                {n.title}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                {kindLabel(n.kind)}
              </span>
              {n.householdName &&
              n.householdId !== 0 &&
              n.householdId !== activeHouseholdId ? (
                <span
                  className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border border-border rounded px-1.5 py-0.5"
                  data-testid={`notif-row-household-${n.id}`}
                >
                  {n.householdName}
                </span>
              ) : null}
            </span>
            {n.body ? (
              <span className="block text-xs text-muted-foreground mt-1 leading-snug">
                {n.body}
              </span>
            ) : null}
            <span
              className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2"
              title={formatAbsolute(n.createdAt)}
            >
              {formatRelative(n.createdAt)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0 px-2 py-1 rounded border border-border"
          data-testid={`notif-deliveries-toggle-${n.id}`}
          aria-expanded={open}
        >
          Delivery
          {open ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>
      {open && (
        <div
          className="px-5 pb-4 pl-12"
          data-testid={`notif-deliveries-${n.id}`}
        >
          {isLoading ? (
            <div className="text-xs text-muted-foreground">
              Loading delivery details…
            </div>
          ) : isError ? (
            <div className="text-xs text-destructive">
              Couldn't load delivery details.
            </div>
          ) : !data || data.deliveries.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No delivery records for this notification.
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {data.deliveries.map((d: DeliveryAttempt) => (
                <li
                  key={d.id}
                  className={cn(
                    "text-[11px] rounded border px-2 py-1 flex items-center gap-2",
                    d.status === "sent" &&
                      "border-emerald-500/40 text-emerald-700 bg-emerald-500/5",
                    d.status === "skipped" &&
                      "border-border text-muted-foreground bg-muted/30",
                    d.status === "failed" &&
                      "border-destructive/50 text-destructive bg-destructive/5",
                  )}
                  title={`${formatAbsolute(d.attemptedAt)}${d.target ? ` · ${d.target}` : ""}`}
                >
                  <span className="font-medium uppercase tracking-wider">
                    {channelLabel(d.channel)}
                  </span>
                  <span>{reasonLabel(d.reason, d.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
