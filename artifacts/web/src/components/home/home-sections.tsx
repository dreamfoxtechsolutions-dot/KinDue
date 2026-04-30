import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Mail,
  Send,
  Shield,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  useGetDashboard,
  useListBills,
  useListPendingBills,
  useListSubscriptions,
  useUpdateBill,
  getListBillsQueryKey,
  getGetDashboardQueryKey,
  BillStatus,
  type Bill,
  type DashboardSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useHouseholdMe } from "@/hooks/use-household";
import { can, type HouseholdMe } from "@/lib/household-api";
import { cn } from "@/lib/utils";
import {
  addDays,
  diffInDays,
  formatRelative,
  initials,
  isSameDay,
  parseLocalIso,
  pastelFromName,
  plainDueDay,
  startOfDay,
  startOfWeekMon,
} from "./home-helpers";

function isUrgent(bill: Bill): boolean {
  return (
    bill.shutoffRisk ||
    bill.riskLevel === "critical" ||
    bill.riskLevel === "high"
  );
}

function riskRank(bill: Bill): number {
  switch (bill.riskLevel) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

// ---------- Mom is okay badge ----------
export function MomOkayBadge({
  caregiverFor,
  onOpenTool,
}: {
  caregiverFor: string;
  onOpenTool: (tab: string) => void;
}) {
  const { data: summary, isLoading, isError } = useGetDashboard();
  if (isLoading || !summary) {
    if (isError) {
      return (
        <p className="text-sm text-muted-foreground">
          Couldn't load — refresh to try again.
        </p>
      );
    }
    return <Skeleton className="h-[112px] w-full rounded-2xl" />;
  }
  const isOkay =
    summary.highRiskCount === 0 && (summary.dueThisWeek ?? 0) === 0;
  const subjectName = caregiverFor || "You";
  const isOkayHeadline = caregiverFor
    ? `${caregiverFor} is okay.`
    : "You're okay.";

  if (isOkay) {
    return (
      <button
        type="button"
        onClick={() => onOpenTool("bills")}
        className="w-full text-left bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm active:bg-emerald-100 transition-colors"
      >
        <div className="bg-emerald-500 rounded-full p-1.5 shrink-0 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[26px] sm:text-[32px] font-semibold text-emerald-950 dark:text-emerald-100 leading-tight">
            {isOkayHeadline}
          </h2>
          <p className="text-base text-emerald-800 dark:text-emerald-200 mt-1 font-medium sm:hidden">
            All accounts healthy
          </p>
          <p className="hidden sm:block text-base text-emerald-800 dark:text-emerald-200 mt-1 font-medium">
            All accounts healthy · Nothing urgent in the next 7 days
          </p>
        </div>
        <span
          aria-hidden
          className="hidden sm:inline-flex items-center justify-center border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100 bg-white/60 dark:bg-emerald-950/40 h-12 px-6 rounded-xl shadow-sm text-sm font-medium"
        >
          View details
        </span>
      </button>
    );
  }

  const attentionCount =
    (summary.highRiskCount ?? 0) + (summary.dueThisWeek ?? 0);
  const billWord = attentionCount === 1 ? "bill" : "bills";
  return (
    <div className="bg-[#F8E7DC] dark:bg-[#3a1f12] border border-[#EAC8AE] dark:border-[#5a2f1a] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
      <div className="bg-[#C97550] rounded-full p-1.5 shrink-0 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-[24px] sm:text-[32px] font-semibold text-[#7A3614] dark:text-[#F8E7DC] leading-tight">
          <span className="sm:hidden">
            {attentionCount} {billWord} need attention
          </span>
          <span className="hidden sm:inline">
            {attentionCount} {billWord} need {subjectName === "You" ? "your" : "your"} attention this week.
          </span>
        </h2>
        <p className="text-sm sm:text-base text-[#7A3614]/85 dark:text-[#EAC8AE] mt-1 font-medium">
          <span className="sm:hidden">
            {summary.dueThisWeek} due this week
            {summary.highRiskCount > 0 ? ` · ${summary.highRiskCount} urgent` : ""}
          </span>
          <span className="hidden sm:inline">
            {summary.dueThisWeek} due in the next 7 days
            {summary.highRiskCount > 0
              ? ` · ${summary.highRiskCount} flagged as urgent`
              : ""}
          </span>
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => onOpenTool("bills")}
        className="border-[#EAC8AE] dark:border-[#5a2f1a] text-[#7A3614] dark:text-[#F8E7DC] bg-white/60 dark:bg-[#3a1f12]/60 hover:bg-[#F2D7C3] dark:hover:bg-[#5a2f1a]/60 h-12 px-6 rounded-xl shadow-sm"
      >
        View details
      </Button>
    </div>
  );
}

// ---------- Monthly impact ----------
export function MonthlyImpactStrip({
  onOpenTool,
}: {
  onOpenTool: (tab: string) => void;
}) {
  const { data: summary, isLoading, isError } = useGetDashboard();
  if (isLoading || !summary) {
    if (isError) {
      return (
        <div className="border-y border-border py-4">
          <p className="text-sm text-muted-foreground">
            Couldn't load — refresh to try again.
          </p>
        </div>
      );
    }
    return (
      <div className="border-y border-border py-4">
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  const headlineDesktop =
    summary.avoidableFees === 0
      ? "We're keeping watch this month — nothing caught yet."
      : `We caught $${summary.avoidableFees.toFixed(2)} in problems this month`;
  const roundedSavings = Math.round(summary.avoidableFees);
  const headlineMobile =
    roundedSavings <= 0
      ? "Watching this month."
      : `Saved $${roundedSavings} this month`;

  const parts: string[] = [];
  if (summary.dueThisWeek > 0)
    parts.push(
      `${summary.dueThisWeek} bill${summary.dueThisWeek === 1 ? "" : "s"} coming this week`,
    );
  if (summary.highRiskCount > 0)
    parts.push(
      `${summary.highRiskCount} need${summary.highRiskCount === 1 ? "s" : ""} attention`,
    );
  const subline = parts.length === 0 ? "Everything looks calm." : parts.join(" · ");

  return (
    <button
      type="button"
      onClick={() => onOpenTool("bills")}
      className="w-full text-left border-y border-border py-4 sm:bg-transparent flex items-center justify-between gap-3 active:bg-muted/40 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl sm:hidden" aria-hidden>
          💪
        </span>
        <Shield className="hidden sm:block w-5 h-5 text-foreground shrink-0" />
        <div className="min-w-0">
          <h3 className="text-base sm:text-xl font-semibold text-foreground leading-tight">
            <span className="sm:hidden">{headlineMobile}</span>
            <span className="hidden sm:inline">{headlineDesktop}</span>
          </h3>
          <p className="hidden sm:block text-sm text-muted-foreground mt-0.5">
            {subline}
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  );
}

// ---------- Today's checklist ----------
type ChecklistItem =
  | {
      kind: "pending";
      key: string;
      label: string;
      sub: string;
      action: () => void;
      actionLabel: string;
      urgent: false;
    }
  | {
      kind: "bill";
      key: string;
      bill: Bill;
      label: string;
      sub: string;
      urgent: boolean;
    }
  | {
      kind: "subscription";
      key: string;
      label: string;
      sub: string;
      href: string;
      actionLabel: string;
      urgent: false;
    };

export function TodayChecklist({
  isReviewOpen: _isReviewOpen,
  onOpenReview,
}: {
  isReviewOpen: boolean;
  onOpenReview: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const household = useHouseholdMe().data;
  const canMarkPaid = can(household, "mark_paid");

  const billsQuery = useListBills();
  const pendingQuery = useListPendingBills();
  const subscriptionsQuery = useListSubscriptions();
  const bills = billsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const subscriptions = subscriptionsQuery.data ?? [];
  const anyLoading =
    (billsQuery.isLoading && !billsQuery.data) ||
    (pendingQuery.isLoading && !pendingQuery.data) ||
    (subscriptionsQuery.isLoading && !subscriptionsQuery.data);
  const anyError =
    billsQuery.isError || pendingQuery.isError || subscriptionsQuery.isError;

  const updateBill = useUpdateBill();
  const [pendingBillId, setPendingBillId] = useState<number | null>(null);

  const upcomingBills = useMemo(() => {
    const today = startOfDay(new Date());
    const horizon = addDays(today, 7);
    return bills
      .filter((b) => b.status !== "paid")
      .filter((b) => {
        const d = parseLocalIso(b.dueDate);
        return d ? d >= today && d <= horizon : false;
      })
      .sort((a, b) => {
        const r = riskRank(b) - riskRank(a);
        if (r !== 0) return r;
        const da = parseLocalIso(a.dueDate)?.getTime() ?? 0;
        const db = parseLocalIso(b.dueDate)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 3);
  }, [bills]);

  const unusedSubscription = useMemo(
    () => subscriptions.find((s) => !s.dismissed),
    [subscriptions],
  );

  const items: ChecklistItem[] = [];
  if (pending.length > 0) {
    items.push({
      kind: "pending",
      key: "pending",
      label: `Review ${pending.length} new ${pending.length === 1 ? "bill" : "bills"}`,
      sub: "Found in your inbox — please confirm.",
      action: onOpenReview,
      actionLabel: "Review now",
      urgent: false,
    });
  }
  for (const bill of upcomingBills) {
    items.push({
      kind: "bill",
      key: `bill-${bill.id}`,
      bill,
      label: `Pay ${bill.name} before ${plainDueDay(bill.dueDate)}`,
      sub: `$${bill.amount.toFixed(2)}${isUrgent(bill) ? " · shutoff risk" : ""}`,
      urgent: isUrgent(bill),
    });
  }
  if (unusedSubscription) {
    items.push({
      kind: "subscription",
      key: `sub-${unusedSubscription.id}`,
      label: `Help me cancel ${unusedSubscription.name}`,
      sub: `$${unusedSubscription.amount.toFixed(2)}/${unusedSubscription.billingCycle || "mo"} · likely unused`,
      href: "/subscriptions",
      actionLabel: "Help me cancel",
      urgent: false,
    });
  }

  const total = items.length;
  const completed = 0;

  const markPaid = (billId: number) => {
    setPendingBillId(billId);
    updateBill.mutate(
      { id: billId, data: { status: BillStatus.paid } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Marked paid" });
        },
        onSettled: () => setPendingBillId(null),
      },
    );
  };

  const snooze = () => {
    toast({ title: "Snooze coming soon" });
  };

  if (anyLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          {anyError && (
            <p className="text-sm text-muted-foreground">
              Couldn't load — refresh to try again.
            </p>
          )}
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-10 text-center flex flex-col items-center gap-4">
          {anyError ? (
            <p className="text-sm text-muted-foreground">
              Couldn't load — refresh to try again.
            </p>
          ) : (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <div>
                <h2 className="font-serif text-2xl font-medium tracking-tight">
                  You're caught up.
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Nothing needs you today.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const progressMobile =
    completed === total
      ? "All done."
      : `${completed} of ${total} done`;
  const progressDesktop =
    completed === total
      ? "All done. You're caught up by lunch."
      : `${completed} of ${total} done — you're on top of this.`;

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="font-serif text-xl sm:text-2xl font-medium tracking-tight">
            Today's checklist
          </h2>
          <span className="text-xs sm:text-sm text-muted-foreground shrink-0 text-right">
            <span className="sm:hidden">{progressMobile}</span>
            <span className="hidden sm:inline">{progressDesktop}</span>
          </span>
        </div>
        <Progress value={Math.round((completed / Math.max(total, 1)) * 100)} className="h-2" />
      </div>
      <CardContent className="p-3 sm:p-4 space-y-3">
        {items.map((item) => (
          <ChecklistRow
            key={item.key}
            item={item}
            canMarkPaid={canMarkPaid}
            onMarkPaid={markPaid}
            onSnooze={snooze}
            pendingBillId={pendingBillId}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ChecklistRow({
  item,
  canMarkPaid,
  onMarkPaid,
  onSnooze,
  pendingBillId,
}: {
  item: ChecklistItem;
  canMarkPaid: boolean;
  onMarkPaid: (id: number) => void;
  onSnooze: () => void;
  pendingBillId: number | null;
}) {
  const triggerPrimary = () => {
    if (item.kind === "pending") item.action();
    else if (item.kind === "bill" && canMarkPaid) onMarkPaid(item.bill.id);
  };

  const isLoading =
    item.kind === "bill" && pendingBillId === item.bill.id;

  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative",
        item.urgent && "border-l-4 border-l-destructive",
      )}
    >
      {item.urgent && (
        <span className="absolute right-3 top-3 text-[10px] font-semibold uppercase tracking-[0.12em] bg-destructive/10 text-destructive border border-destructive/40 px-2 py-0.5 rounded-full">
          Shutoff risk
        </span>
      )}
      <div className="flex items-start gap-3 sm:gap-4 sm:flex-1 min-w-0">
        <button
          type="button"
          aria-label="Mark complete"
          onClick={triggerPrimary}
          className="h-12 w-12 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors shrink-0"
        />
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-base sm:text-lg font-medium text-foreground leading-snug">
            {item.label}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{item.sub}</p>
        </div>
      </div>
      <div className="flex flex-col sm:items-end gap-2 sm:gap-1 sm:shrink-0 w-full sm:w-auto">
        {item.kind === "pending" && (
          <Button
            onClick={item.action}
            className="h-12 px-5 w-full sm:w-auto"
          >
            {item.actionLabel}
          </Button>
        )}
        {item.kind === "bill" && canMarkPaid && (
          <>
            <Button
              onClick={() => onMarkPaid(item.bill.id)}
              disabled={isLoading}
              className="h-12 px-5 w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark paid"}
            </Button>
            <button
              type="button"
              onClick={onSnooze}
              className="text-xs text-muted-foreground underline mt-1 self-center sm:self-end"
            >
              Snooze
            </button>
          </>
        )}
        {item.kind === "subscription" && (
          <Button asChild className="h-12 px-5 w-full sm:w-auto">
            <Link href={item.href}>{item.actionLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- This week strip ----------
export function WeekStrip({
  onOpenTool,
}: {
  onOpenTool: (tab: string) => void;
}) {
  const billsQuery = useListBills();
  const bills = billsQuery.data ?? [];
  const billsLoading = billsQuery.isLoading && !billsQuery.data;
  const billsError = billsQuery.isError;
  const today = startOfDay(new Date());
  const weekStart = startOfWeekMon(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const letters = ["M", "T", "W", "T", "F", "S", "S"];

  const billsByDay = new Map<string, Bill[]>();
  for (const day of days) {
    billsByDay.set(day.toDateString(), []);
  }
  for (const bill of bills) {
    const d = parseLocalIso(bill.dueDate);
    if (!d) continue;
    const key = d.toDateString();
    if (billsByDay.has(key)) billsByDay.get(key)!.push(bill);
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-medium tracking-tight">
            This week
          </h2>
          <Button
            variant="link"
            onClick={() => onOpenTool("calendar")}
            className="px-0 h-auto text-sm font-medium"
          >
            Open calendar <ChevronRight className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
        {/* Mobile: horizontally scrollable day cells */}
        <div className="sm:hidden -mx-5 px-5 flex gap-3 overflow-x-auto snap-x pb-2">
          {days.map((day, idx) => {
            const dayBills = billsByDay.get(day.toDateString()) ?? [];
            const isToday = isSameDay(day, today);
            const hasUrgent = dayBills.some((b) => isUrgent(b) && b.status !== "paid");
            const hasDue = dayBills.some((b) => b.status !== "paid");
            const borderCls = isToday
              ? "border-2 border-primary/40 bg-primary/10 dark:bg-primary/20 dark:border-primary/50"
              : hasUrgent
                ? "border-2 border-[#9B3A2D]/40 bg-[#F2DAD3] dark:bg-[#3a1814] dark:border-[#9B3A2D]/60"
                : hasDue
                  ? "border-2 border-[#EAC8AE] bg-[#F8E7DC] dark:bg-[#3a1f12] dark:border-[#5a2f1a]"
                  : "border border-border bg-background";
            const dotCls = isToday
              ? "bg-primary"
              : hasUrgent
                ? "bg-[#9B3A2D]"
                : hasDue
                  ? "bg-[#C97550]"
                  : null;
            const labelCls = isToday
              ? "text-primary dark:text-primary"
              : hasUrgent
                ? "text-[#9B3A2D] dark:text-[#F2DAD3]"
                : hasDue
                  ? "text-[#7A3614] dark:text-[#EAC8AE]"
                  : "text-muted-foreground";
            const numCls = isToday
              ? "text-primary dark:text-primary"
              : hasUrgent
                ? "text-[#9B3A2D] dark:text-[#F2DAD3]"
                : hasDue
                  ? "text-[#7A3614] dark:text-[#EAC8AE]"
                  : "text-foreground";
            return (
              <div
                key={`m-${idx}`}
                className={cn(
                  "shrink-0 w-[64px] snap-center rounded-2xl flex flex-col items-center py-3 relative",
                  borderCls,
                )}
              >
                {isToday && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-primary rounded-t-2xl" />
                )}
                <span className={cn("text-[13px] font-bold uppercase", labelCls)}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={cn("text-[22px] font-bold leading-none mt-1", numCls)}>
                  {day.getDate()}
                </span>
                {dotCls && (
                  <div className={cn("w-2 h-2 rounded-full mt-2", dotCls)} />
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop: detailed grid */}
        <div className="hidden sm:grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dayBills = billsByDay.get(day.toDateString()) ?? [];
            const isToday = isSameDay(day, today);
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-md border p-2 min-h-[96px] flex flex-col gap-2",
                  isToday
                    ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                    : "border-border bg-background",
                )}
              >
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
                    {letters[idx]}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-mono tabular-nums",
                      isToday ? "text-primary font-semibold" : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </div>
                </div>
                <div className="space-y-1 mt-auto">
                  {billsLoading && (
                    <Skeleton className="h-4 w-full rounded" />
                  )}
                  {!billsLoading && dayBills.slice(0, 3).map((bill) => {
                    const urgent = isUrgent(bill);
                    const due = bill.status !== "paid";
                    const cls = urgent
                      ? "bg-destructive/10 text-destructive border-destructive/40"
                      : due
                        ? "bg-[#F8E7DC] text-[#7A3614] dark:bg-[#3a1f12] dark:text-[#EAC8AE] border-transparent"
                        : "bg-muted text-muted-foreground border-transparent";
                    const truncated =
                      bill.name.length > 10
                        ? bill.name.slice(0, 10) + "…"
                        : bill.name;
                    return (
                      <Tooltip key={bill.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "text-[11px] font-medium px-1.5 py-0.5 rounded truncate border",
                              cls,
                            )}
                          >
                            {truncated}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {bill.name} — ${bill.amount.toFixed(2)}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Care team ----------
export function CareTeamStrip({
  household,
  currentUserId,
}: {
  household: HouseholdMe;
  currentUserId: string | null | undefined;
}) {
  const { toast } = useToast();
  const members = household.members ?? [];

  if (members.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <Link
            href="/household"
            className="text-sm font-medium text-primary hover:underline"
          >
            Set up your care team →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-serif text-xl font-medium tracking-tight">
            Your care team
          </h2>
          <div className="hidden sm:flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => toast({ title: "Coming soon" })}
              className="h-10 px-4 text-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Send weekly update to family
            </Button>
            <Link
              href="/household"
              className="text-sm font-medium text-primary hover:underline inline-flex items-center"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Invite family
            </Link>
          </div>
        </div>

        {/* Mobile: scrollable avatar cards */}
        <div className="sm:hidden -mx-5 px-5 flex gap-4 overflow-x-auto snap-x pb-2">
          {members.slice(0, 5).map((member) => {
            const name = member.displayName || member.email || "Member";
            const isMe = currentUserId === member.userId;
            const isActive =
              (member.role === "owner" || member.role === "full") && isMe;
            const roleLabel = isMe ? "Primary" : member.roleLabel;
            return (
              <div
                key={`m-${member.userId}`}
                className="shrink-0 w-[140px] snap-start rounded-2xl border border-border p-4 flex flex-col items-center text-center bg-background"
              >
                <div className="relative mb-3">
                  <div
                    className={cn(
                      "h-14 w-14 rounded-full grid place-items-center text-base font-semibold border-2 border-background shadow-sm",
                      pastelFromName(name),
                    )}
                  >
                    {initials(name)}
                  </div>
                  {isActive && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <h3 className="font-bold text-foreground text-base leading-tight">
                  {isMe ? "You" : name.split(" ")[0]}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
              </div>
            );
          })}
        </div>
        <Button
          variant="outline"
          onClick={() => toast({ title: "Coming soon" })}
          className="sm:hidden w-full h-12 mt-3 text-sm font-semibold"
        >
          <Send className="w-4 h-4 mr-2" />
          Send weekly update to family
        </Button>

        {/* Desktop: existing horizontal row */}
        <div className="hidden sm:flex items-center gap-6 overflow-x-auto pb-1">
          {members.slice(0, 5).map((member) => {
            const name = member.displayName || member.email || "Member";
            const isMe = currentUserId === member.userId;
            let status: React.ReactNode;
            let dot = false;
            if (member.role === "owner" || member.role === "full") {
              if (isMe) {
                status = (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Active now
                  </span>
                );
                dot = true;
              } else {
                status = `Last seen ${formatRelative(member.lastActiveAt)}`;
              }
            } else if (member.role === "alerts_only") {
              status = "Alerts only";
            } else {
              status = `Last seen ${formatRelative(member.lastActiveAt)}`;
            }
            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 min-w-max"
              >
                <div className="relative">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-full grid place-items-center text-base font-semibold border border-border",
                      pastelFromName(name),
                    )}
                  >
                    {initials(name)}
                  </div>
                  {dot && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {name}
                    {isMe ? " (You)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.roleLabel} · {status}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Quick tiles ----------
export function QuickTiles({
  caregiverFor,
  onScan,
  canScan,
  scanPending,
  lastScanAt,
}: {
  caregiverFor: string;
  onScan: () => void;
  canScan: boolean;
  scanPending: boolean;
  lastScanAt: string | null;
}) {
  const { data: summary } = useGetDashboard();
  const isOkay =
    !!summary &&
    summary.highRiskCount === 0 &&
    (summary.dueThisWeek ?? 0) === 0;
  const subject = caregiverFor || "Your";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {/* Scan inbox — primary tile (indigo on mobile, accent on desktop) */}
      <button
        type="button"
        onClick={onScan}
        disabled={!canScan || scanPending}
        className="sm:order-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-5 bg-primary text-primary-foreground border border-primary rounded-2xl hover:bg-primary/90 transition-all text-left disabled:opacity-60 h-[120px] sm:h-auto"
      >
        <div className="sm:bg-primary-foreground/15 sm:p-3 sm:rounded-xl shrink-0">
          {scanPending ? (
            <Loader2 className="w-7 h-7 sm:w-6 sm:h-6 animate-spin" />
          ) : (
            <Mail className="w-7 h-7 sm:w-6 sm:h-6" />
          )}
        </div>
        <div className="min-w-0 mt-auto sm:mt-0">
          <h3 className="font-bold sm:font-medium text-[17px] sm:text-base leading-tight">
            <span className="sm:hidden">Scan inbox</span>
            <span className="hidden sm:inline">
              Check {caregiverFor ? `${caregiverFor}'s` : "your"} email for new bills
            </span>
          </h3>
          <p className="hidden sm:block text-xs text-primary-foreground/80 mt-1">
            {scanPending ? "Scanning…" : `Last scan ${formatRelative(lastScanAt)}`}
          </p>
        </div>
      </button>

      <Link
        href="/household"
        className="sm:order-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-5 bg-card border border-border rounded-2xl hover:border-foreground/30 hover:shadow-sm transition-all h-[120px] sm:h-auto"
      >
        <div
          className={cn(
            "sm:p-3 sm:rounded-xl shrink-0",
            isOkay ? "sm:bg-emerald-100 sm:dark:bg-emerald-900/40" : "sm:bg-muted",
          )}
        >
          {isOkay ? (
            <CheckCircle2 className="w-7 h-7 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Activity className="w-7 h-7 sm:w-6 sm:h-6 text-foreground" />
          )}
        </div>
        <div className="min-w-0 mt-auto sm:mt-0">
          <h3 className="font-bold sm:font-medium text-[17px] sm:text-base leading-tight">
            <span className="sm:hidden">{caregiverFor || "Your"}{caregiverFor ? "'s" : ""} status</span>
            <span className="hidden sm:inline">{subject}{caregiverFor ? "'s" : ""} status</span>
          </h3>
          <p className="hidden sm:block text-xs text-muted-foreground mt-1">
            {isOkay ? "All accounts healthy" : "Needs your attention"}
          </p>
        </div>
      </Link>

      <Link
        href="/household?tab=documents"
        className="sm:order-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-5 bg-card border border-border rounded-2xl hover:border-foreground/30 hover:shadow-sm transition-all h-[120px] sm:h-auto"
      >
        <div className="sm:bg-muted sm:p-3 sm:rounded-xl shrink-0">
          <FileText className="w-7 h-7 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-300" />
        </div>
        <div className="min-w-0 mt-auto sm:mt-0">
          <h3 className="font-bold sm:font-medium text-[17px] sm:text-base leading-tight">Documents</h3>
          <p className="hidden sm:block text-xs text-muted-foreground mt-1">
            POA, insurance, wills
          </p>
        </div>
      </Link>

      {/* Mobile-only fourth tile — Bills shortcut */}
      <Link
        href="/subscriptions"
        className="sm:hidden flex flex-col items-start gap-3 p-5 bg-card border border-border rounded-2xl hover:border-foreground/30 hover:shadow-sm transition-all h-[120px]"
      >
        <Activity className="w-7 h-7 text-slate-600 dark:text-slate-300" />
        <h3 className="font-bold text-[17px] leading-tight mt-auto">Bills</h3>
      </Link>
    </div>
  );
}

// ---------- Rest state band ----------
export function RestStateBand({ caregiverFor }: { caregiverFor: string }) {
  const { data: bills = [] } = useListBills();
  const today = startOfDay(new Date());
  const horizon = addDays(today, 7);

  const upcoming = bills.filter((b) => {
    if (b.status === "paid") return false;
    const d = parseLocalIso(b.dueDate);
    return d && d >= today && d <= horizon;
  });

  const nextBill = bills
    .filter((b) => b.status !== "paid")
    .map((b) => ({ b, d: parseLocalIso(b.dueDate) }))
    .filter((x) => x.d && x.d >= today)
    .sort((a, b) => (a.d!.getTime() - b.d!.getTime()))[0];

  const headline = caregiverFor
    ? `You and ${caregiverFor} are on top of this.`
    : "You're on top of this.";

  let subline: string;
  if (upcoming.length === 0) {
    if (nextBill && nextBill.d) {
      const days = diffInDays(nextBill.d, today);
      const when =
        days < 14
          ? plainDueDay(nextBill.b.dueDate)
          : nextBill.d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
      subline = `Nothing else until ${when}.`;
    } else {
      subline = "Nothing else right now.";
    }
  } else {
    subline = "Finish today's list and you're set for the week.";
  }

  return (
    <section className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-3xl sm:rounded-xl py-8 sm:py-12 px-6 text-center sm:bg-muted/40 sm:border-0">
      <h2 className="font-serif text-[28px] sm:text-4xl font-medium tracking-tight text-emerald-900 dark:text-emerald-100 sm:text-foreground leading-tight">
        {headline}
      </h2>
      <p className="text-base sm:text-lg text-emerald-700 dark:text-emerald-200 sm:text-muted-foreground mt-2 sm:mt-3 font-medium sm:font-normal">
        {subline}
      </p>
    </section>
  );
}

// ---------- Trust footer ----------
export function TrustFooter({ lastCheckedIso }: { lastCheckedIso: string | null }) {
  return (
    <footer className="text-center py-6">
      {/* Mobile: stacked, centered */}
      <div className="sm:hidden flex flex-col items-center gap-1.5 text-[13px] text-muted-foreground font-medium">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Bank-level encryption
        </span>
        <span>We never move your money</span>
        <span>Last checked {formatRelative(lastCheckedIso)}</span>
      </div>
      {/* Desktop: single line */}
      <div className="hidden sm:inline-flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          🔒 Bank-level encryption
        </span>
        <span className="opacity-60">·</span>
        <span>We never move your money</span>
        <span className="opacity-60">·</span>
        <span>Last checked {formatRelative(lastCheckedIso)}</span>
      </div>
    </footer>
  );
}

// Re-export for typing convenience
export type { DashboardSummary };
