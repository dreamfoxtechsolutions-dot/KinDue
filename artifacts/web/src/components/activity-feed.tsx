import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity as ActivityIcon, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  activityApi,
  type ActivityEntry,
  type ActivityResponse,
} from "@/lib/activity-api";
import { useHouseholdMe } from "@/hooks/use-household";

const PAGE_SIZE = 50;
// How long the feed must be on screen before we advance the
// "last seen" marker. Long enough that the user has plausibly looked
// at the highlighted "new" rows, short enough that walking away from
// the screen still counts as catching up.
const MARK_SEEN_DELAY_MS = 2500;

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
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Short verb describing the action; used in the badge so the row reads like
// "Jane · Marked paid · 2h ago".
function actionVerb(action: string): string {
  const map: Record<string, string> = {
    created: "Added",
    updated: "Edited",
    deleted: "Deleted",
    paid: "Marked paid",
    claimed: "Claimed",
    comment: "Commented",
    escalated: "Escalated",
    alert_acknowledged: "Acknowledged alert",
    proxy_acknowledged: "Confirmed proxy authority",
    visit_recorded: "Logged a visit",
    visit_snoozed: "Snoozed visit reminder",
    caregiver_presence_updated: "Updated check-in details",
    first_run_completed: "Finished welcome walkthrough",
    invited: "Invited",
    invite_revoked: "Revoked invite",
    invite_expired: "Invite expired",
    role_changed: "Changed role",
    removed: "Removed",
    joined: "Joined",
    scan_run: "Scanned",
    approved: "Approved",
    rejected: "Rejected",
    choice_set: "Set onboarding",
  };
  return map[action] ?? humanize(action);
}

type FeedRow =
  | {
      kind: "entry";
      entry: ActivityEntry;
      isNewByOther: boolean;
    }
  | { kind: "divider"; lastSeenIso: string };

// Splits the raw entries into a render list with at most one "Earlier"
// divider, placed where the user's last-seen timestamp falls. Items
// authored by the current user are never marked "new" — you can't be
// surprised by your own action.
function buildFeedRows(
  items: ActivityEntry[],
  lastSeenAt: string | null,
  currentUserId: string | null,
): { rows: FeedRow[]; newByOthers: number } {
  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : null;
  let newByOthers = 0;
  let dividerInserted = false;
  const rows: FeedRow[] = [];

  for (const entry of items) {
    const tMs = new Date(entry.createdAt).getTime();
    const isNewerThanLastSeen =
      lastSeenMs === null || (Number.isFinite(tMs) && tMs > lastSeenMs);
    const isByOther =
      currentUserId !== null && entry.actorUserId !== currentUserId;
    const isNewByOther = isNewerThanLastSeen && isByOther;

    if (isNewByOther) newByOthers += 1;

    // Insert the divider exactly once, at the boundary between
    // "newer than last seen" and "older than last seen". We don't show
    // a divider when there's no last-seen value (everything is new) or
    // when the last-seen marker hasn't been crossed within the loaded
    // pages.
    if (
      lastSeenAt !== null &&
      !dividerInserted &&
      lastSeenMs !== null &&
      Number.isFinite(tMs) &&
      tMs <= lastSeenMs
    ) {
      rows.push({ kind: "divider", lastSeenIso: lastSeenAt });
      dividerInserted = true;
    }

    rows.push({ kind: "entry", entry, isNewByOther });
  }

  return { rows, newByOthers };
}

export function ActivityFeed() {
  const [, setLocation] = useLocation();
  const householdQuery = useHouseholdMe();
  const me = householdQuery.data;
  const queryClient = useQueryClient();

  const [actor, setActor] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  // The search box updates `searchInput` immediately for snappy typing,
  // and we debounce into `searchQuery` (which feeds the request) so we
  // don't fire a network request on every keystroke.
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === searchQuery) return;
    const t = window.setTimeout(() => setSearchQuery(trimmed), 250);
    return () => window.clearTimeout(t);
  }, [searchInput, searchQuery]);

  // The lastSeenAt boundary is captured from the very first response and
  // frozen in a ref. Subsequent refetches (or the markSeen success
  // invalidation) would otherwise return a fresher boundary and erase
  // the highlights mid-visit. We keep the divider stable until the
  // user navigates away and comes back.
  const frozenLastSeenRef = useRef<string | null | undefined>(undefined);
  const markSeenFiredRef = useRef(false);

  const queryKey = useMemo(
    () =>
      [
        "household-activity",
        me?.household.id ?? null,
        actor,
        type,
        from,
        to,
        searchQuery,
      ] as const,
    [me?.household.id, actor, type, from, to, searchQuery],
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
    isFetching,
  } = useInfiniteQuery<ActivityResponse, Error>({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      activityApi.list({
        limit: PAGE_SIZE,
        cursor: (pageParam as string | null) ?? null,
        actor,
        type,
        from: from || null,
        to: to || null,
        q: searchQuery || null,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(me?.household.id),
  });

  const firstPage = data?.pages?.[0];
  const items: ActivityEntry[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.activity),
    [data],
  );

  // Capture the lastSeenAt boundary from the first successful response.
  // Frozen until the component unmounts so the divider stays put even
  // after we POST the new "seen" timestamp.
  useEffect(() => {
    if (firstPage && frozenLastSeenRef.current === undefined) {
      frozenLastSeenRef.current = firstPage.lastSeenAt;
    }
  }, [firstPage]);
  const effectiveLastSeen =
    frozenLastSeenRef.current === undefined
      ? (firstPage?.lastSeenAt ?? null)
      : frozenLastSeenRef.current;
  const currentUserId = firstPage?.currentUserId ?? null;

  const { rows, newByOthers } = useMemo(
    () => buildFeedRows(items, effectiveLastSeen, currentUserId),
    [items, effectiveLastSeen, currentUserId],
  );

  const markSeen = useMutation({
    mutationFn: () => activityApi.markSeen(),
    onSuccess: () => {
      // Refresh the household-me cache so any "unread" badges elsewhere
      // pick up the new state on next read. The frozen ref above
      // prevents the divider in *this* view from jumping.
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // Schedule the markSeen call once per mount, after the first page
  // has rendered for long enough that the user has plausibly seen the
  // highlights. We only mark seen when no filters are applied so that
  // the marker reflects a true "I caught up on everything" moment, not
  // a narrow filtered slice.
  const filtersClean =
    actor === "all" && type === "all" && !from && !to && !searchQuery;
  // Task #59 retired the dependent-only tier; every remaining role sees
  // the full household audit feed and can mark it seen.
  useEffect(() => {
    if (!firstPage) return;
    if (markSeenFiredRef.current) return;
    if (!filtersClean) return;
    const t = window.setTimeout(() => {
      markSeenFiredRef.current = true;
      markSeen.mutate();
    }, MARK_SEEN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [firstPage, filtersClean, markSeen]);

  // Filter dropdown options come from the first page so they always reflect
  // what the household actually has on record.
  const filterMeta = firstPage?.filters;

  const handleClick = (entry: ActivityEntry) => {
    if (entry.link) setLocation(entry.link);
  };

  const handleReset = () => {
    setActor("all");
    setType("all");
    setFrom("");
    setTo("");
    setSearchInput("");
    setSearchQuery("");
  };

  const filtersActive = !filtersClean;
  const showSinceLastVisitHeader =
    filtersClean && firstPage !== undefined && !isLoading;
  const lastVisitLabel =
    effectiveLastSeen ?
      `Last visit ${formatRelative(effectiveLastSeen)}` : "First visit";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-xl font-medium tracking-tight">
            Household activity
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-prose">
            Who paid what, when, and on whose behalf. Updated as soon as
            anyone in {me?.household.caregiverFor
              ? `${me.household.caregiverFor}'s`
              : "your"}{" "}
            household takes an action.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="gap-2"
          data-testid="activity-refresh"
        >
          <RotateCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* "Since you were last here" framing. Hidden when filters are
          active because the count would only reflect the filtered slice
          and would mislead the caregiver about how much they've actually
          missed across the household. */}
      {showSinceLastVisitHeader ? (
        <div
          className={cn(
            "rounded-md border p-4 flex items-start gap-3",
            newByOthers > 0
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-card/40",
          )}
          data-testid="activity-since-banner"
          aria-live="polite"
        >
          <Sparkles
            className={cn(
              "h-5 w-5 mt-0.5 shrink-0",
              newByOthers > 0 ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {newByOthers === 0
                  ? "You're all caught up."
                  : newByOthers === 1
                    ? "1 update from your co-caregiver since you were last here."
                    : `${newByOthers} updates from your co-caregivers since you were last here.`}
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                title={
                  effectiveLastSeen ? formatAbsolute(effectiveLastSeen) : ""
                }
              >
                {lastVisitLabel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-prose">
              {newByOthers > 0
                ? "New items are highlighted below. Older history is shown after the divider."
                : "We'll let you know here whenever someone else in the household takes action."}
            </p>
          </div>
        </div>
      ) : filtersActive ? (
        <div
          className="rounded-md border border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground"
          data-testid="activity-filters-active-note"
        >
          Filters are active — the "since you were last here" tally is
          paused. Clear filters to see new updates highlighted.
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card/40 p-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Search
          </span>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search activity (e.g. electric, Mom)"
              className="pl-8 pr-8"
              data-testid="activity-filter-search"
              aria-label="Search activity entries"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
                data-testid="activity-filter-search-clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Person
          </span>
          <Select
            value={actor}
            onValueChange={setActor}
          >
            <SelectTrigger
              className="w-[200px]"
              data-testid="activity-filter-actor"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {(filterMeta?.actors ?? []).map((a) => (
                <SelectItem key={a.userId} value={a.userId}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Activity
          </span>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger
              className="w-[180px]"
              data-testid="activity-filter-type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(filterMeta?.types ?? []).map((t) => (
                <SelectItem key={t} value={t}>
                  {humanize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            From
          </span>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
            data-testid="activity-filter-from"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            To
          </span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
            data-testid="activity-filter-to"
          />
        </div>

        {(actor !== "all" || type !== "all" || from || to || searchInput) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            data-testid="activity-filter-reset"
          >
            Clear
          </Button>
        )}
      </div>

      <div
        className="rounded-md border border-border bg-card overflow-hidden"
        data-testid="activity-list"
      >
        {isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : isError ? (
          <div className="px-4 py-12 text-center text-sm text-destructive">
            Couldn't load activity
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
          <div
            className="px-4 py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-3"
            data-testid="activity-empty-state"
          >
            <ActivityIcon className="h-6 w-6 text-muted-foreground/60" />
            <span>
              {searchQuery
                ? `No activity matches "${searchQuery}".`
                : filtersActive
                  ? "No activity matches these filters yet."
                  : "No activity yet."}
            </span>
            {filtersActive ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleReset}
                className="px-1"
                data-testid="activity-empty-reset"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              if (row.kind === "divider") {
                return (
                  <li
                    key="divider-last-seen"
                    aria-hidden="true"
                    data-testid="activity-divider"
                    className="px-5 py-2 bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-3"
                  >
                    <span className="h-px flex-1 bg-border" />
                    <span>
                      Earlier — before {formatRelative(row.lastSeenIso)}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </li>
                );
              }
              const { entry, isNewByOther } = row;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(entry)}
                    className={cn(
                      "w-full text-left px-5 py-4 transition-colors flex gap-3 items-start",
                      isNewByOther
                        ? "bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary -ml-px pl-[calc(1.25rem-3px)]"
                        : "hover:bg-muted/60",
                    )}
                    data-testid={`activity-row-${entry.id}`}
                    data-new={isNewByOther ? "1" : undefined}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        {isNewByOther ? (
                          <span
                            className="text-[10px] uppercase tracking-[0.14em] font-semibold rounded px-1.5 py-0.5 bg-primary text-primary-foreground"
                            aria-label="New since your last visit"
                          >
                            New
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "text-sm leading-snug",
                            isNewByOther ? "font-semibold" : "font-medium",
                          )}
                        >
                          {entry.actorName ||
                            entry.actorEmail ||
                            "Someone"}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {actionVerb(entry.action)}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {humanize(entry.entityType)}
                        </span>
                      </span>
                      {entry.summary ? (
                        <span className="block text-xs text-muted-foreground mt-1 leading-snug">
                          {entry.summary}
                        </span>
                      ) : null}
                      <span
                        className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2"
                        title={formatAbsolute(entry.createdAt)}
                      >
                        {formatRelative(entry.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {items.length > 0 ? (
        <div className="flex justify-center">
          {hasNextPage ? (
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              data-testid="activity-load-more"
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
    </section>
  );
}
