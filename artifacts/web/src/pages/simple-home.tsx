import { useMemo, useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation, Link } from "wouter";
import {
  useUpdateBill,
  useListSubscriptions,
  BillStatus,
  type Bill,
  type Subscription,
} from "@workspace/api-client-react";
import { useBills, useInvalidateHouseholdData } from "@/lib/api-hooks";
import { useActiveHousehold } from "@/lib/active-household";
import {
  Shield,
  Check,
  Loader2,
  ArrowRight,
  LogOut,
  Settings,
  Home as HomeIcon,
  CreditCard,
  Users,
  User,
  Repeat,
  AlertTriangle,
  MapPin,
  Lock,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineError } from "@/components/inline-error";
import { WellnessCheckinCard } from "@/components/wellness-checkin-card";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { useScanCapability } from "@/hooks/use-scan-capability";
import { useToast } from "@/hooks/use-toast";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(dueDateIso: string): number {
  const due = new Date(dueDateIso);
  due.setHours(0, 0, 0, 0);
  const today = startOfToday();
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

// A subscription is flagged as "critical" — i.e. likely unused and worth
// reviewing — when we have a service location for it but either no
// recorded nearby visit at all, or the most recent nearby visit was
// more than 60 days ago. The location data comes from the geo sampler;
// subscriptions without any location are skipped (we have no signal).
const STALE_VISIT_DAYS = 60;

// Note: serviceLat/serviceLng/lastNearVisitAt aren't on the canonical
// Subscription schema today. Until the geo presence backend lands we
// keep the predicate but it'll always return false.
type SubscriptionWithGeo = Subscription & {
  serviceLat?: number | null;
  serviceLng?: number | null;
  lastNearVisitAt?: string | null;
  emailSender?: string | null;
};

function isCriticalSubscription(sub: Subscription): boolean {
  const s = sub as SubscriptionWithGeo;
  const hasLocation =
    typeof s.serviceLat === "number" && typeof s.serviceLng === "number";
  if (!hasLocation) return false;
  if (!s.lastNearVisitAt) return true;
  const last = new Date(s.lastNearVisitAt).getTime();
  if (Number.isNaN(last)) return true;
  const daysSince = (Date.now() - last) / 86_400_000;
  return daysSince > STALE_VISIT_DAYS;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SimpleHome() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { householdId } = useActiveHousehold();
  const invalidate = useInvalidateHouseholdData();
  const { toast } = useToast();

  const {
    data: bills,
    isLoading,
    isError: billsError,
    isFetching: billsFetching,
    refetch: refetchBills,
  } = useBills();
  const {
    data: subscriptions,
    isError: subsError,
    isFetching: subsFetching,
    refetch: refetchSubs,
  } = useListSubscriptions();
  const updateBill = useUpdateBill();
  const { canScan } = useScanCapability();

  const [pendingPaidId, setPendingPaidId] = useState<number | null>(null);
  const [subsOpen, setSubsOpen] = useState(false);

  // "Active" recurring subscriptions are anything the user hasn't
  // dismissed and that's still flagged as active by the detector.
  const activeSubscriptions = useMemo<Subscription[]>(() => {
    return (subscriptions ?? []).filter(
      (s) => !s.dismissed && s.status !== "cancelled",
    );
  }, [subscriptions]);

  const criticalSubscriptions = useMemo<Subscription[]>(() => {
    return activeSubscriptions.filter(isCriticalSubscription);
  }, [activeSubscriptions]);

  const upcoming = useMemo<Bill[]>(() => {
    const list = bills ?? [];
    return list
      .filter((b) => b.status !== BillStatus.paid)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills]);

  const totalDue = useMemo(
    () => upcoming.reduce((sum, b) => sum + b.amount, 0),
    [upcoming],
  );

  const markPaid = (id: number) => {
    if (householdId == null) return;
    setPendingPaidId(id);
    updateBill.mutate(
      { householdId, billId: id, data: { status: BillStatus.paid } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Marked as paid" });
          setPendingPaidId(null);
        },
        onError: (err: { message?: string }) => {
          toast({
            title: "Couldn't update",
            description: err?.message ?? "Try again.",
            variant: "destructive",
          });
          setPendingPaidId(null);
        },
      },
    );
  };

  const firstName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";

  return (
    <AppShell>
      <>
        {/* Greeting */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <h1 className="font-serif text-2xl font-medium mt-1">
            {greetingForHour(new Date().getHours())}, {firstName}.
          </h1>
        </div>

        {/* Wellness check-in nudge: surfaces "you haven't visited Mom
            in X days" using the same geo-presence data we use for
            stale subscriptions. Quietly hides itself when there's
            nothing to nudge about. */}
        <WellnessCheckinCard />

        {/* HERO — single dominant card so the user always knows the
            one thing that matters most: what's owed right now. */}
        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium px-1">
            Today
          </p>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : billsError ? (
            <InlineError
              title="We couldn't load today's bills"
              description="Tap below to try again — nothing has been lost."
              onRetry={() => void refetchBills()}
              retrying={billsFetching}
            />
          ) : (
            <>
              <OverviewCard
                totalDue={totalDue}
                unpaidCount={upcoming.length}
              />
              {/* Caregiver / view-only roles can't trigger a scan, so
                  a stubbornly-empty dashboard is confusing. Surface a
                  brief explanation right under the hero so they know
                  it's not broken — just waiting on the household admin. */}
              {canScan === false && (bills?.length ?? 0) === 0 && (
                <ViewOnlyNotice />
              )}
            </>
          )}
        </section>

        {/* SECONDARY — Planner and Subscriptions live together under a
            single muted heading. They are intentionally smaller, share
            visual weight, and never compete with the hero above. */}
        <section className="space-y-3 pt-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
              More to review
            </h2>
          </div>
          <div className="space-y-3">
            {subsError ? (
              <InlineError
                size="compact"
                title="Couldn't load subscriptions"
                description="We'll show your recurring charges as soon as we can reach the server."
                onRetry={() => void refetchSubs()}
                retrying={subsFetching}
              />
            ) : (
              <SubscriptionsPanel
                activeCount={activeSubscriptions.length}
                criticalCount={criticalSubscriptions.length}
                onView={() => setSubsOpen(true)}
              />
            )}
          </div>
        </section>

        {/* Calm trust reassurance — sits below the planner so it reads
            as the closing reassurance after the practical content,
            rather than competing with the bills hero. */}
        <TrustReassurance />

      </>

      <SubscriptionsDialog
        open={subsOpen}
        onOpenChange={setSubsOpen}
        subscriptions={activeSubscriptions}
        onManageAll={() => {
          setSubsOpen(false);
          setLocation("/subscriptions");
        }}
      />
    </AppShell>
  );
}

function TrustReassurance() {
  return (
    <section
      aria-label="Your household is protected"
      className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3.5 flex items-start gap-3"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Shield className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-base font-medium leading-tight">
          You're watching over them — we're watching with you.
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Bills, subscriptions, and household details stay private to your
          family. Encrypted in transit and at rest, with sign-in protection
          on every device.
        </p>
        <p className="text-[11px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
          <Lock className="h-3 w-3" />
          End-to-end protected · Caregiver-only access
        </p>
      </div>
    </section>
  );
}

function SubscriptionsPanel({
  activeCount,
  criticalCount,
  onView,
}: {
  activeCount: number;
  criticalCount: number;
  onView: () => void;
}) {
  return (
    <Card className="border-foreground/15">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Repeat className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
            Recurring subscriptions
          </p>
          <p className="font-serif text-xl font-medium mt-0.5">
            {activeCount} active
          </p>
          {criticalCount > 0 ? (
            <p className="text-xs text-destructive mt-0.5 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} look unused — review them
            </p>
          ) : activeCount > 0 ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              All look used recently.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              None detected yet.
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          disabled={activeCount === 0}
          className="shrink-0"
        >
          View
        </Button>
      </CardContent>
    </Card>
  );
}

function SubscriptionsDialog({
  open,
  onOpenChange,
  subscriptions,
  onManageAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptions: Subscription[];
  onManageAll: () => void;
}) {
  // Sort: critical first, then by amount descending so the priciest
  // unreviewed charges are easiest to spot.
  const sorted = useMemo(() => {
    const list = [...subscriptions];
    list.sort((a, b) => {
      const critA = isCriticalSubscription(a) ? 1 : 0;
      const critB = isCriticalSubscription(b) ? 1 : 0;
      if (critA !== critB) return critB - critA;
      return b.amount - a.amount;
    });
    return list;
  }, [subscriptions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Recurring subscriptions
          </DialogTitle>
          <DialogDescription>
            Critical items have a service location you haven't been near
            recently — they may be safe to cancel.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh] -mx-6 px-6">
          <ul className="space-y-2 pt-1">
            {sorted.map((s) => (
              <SubscriptionRow key={s.id} subscription={s} />
            ))}
            {sorted.length === 0 && (
              <li className="text-sm text-muted-foreground text-center py-6">
                No active subscriptions detected.
              </li>
            )}
          </ul>
        </ScrollArea>
        <Button variant="outline" onClick={onManageAll} className="gap-2">
          Open subscriptions page
          <ArrowRight className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionRow({ subscription }: { subscription: Subscription }) {
  const critical = isCriticalSubscription(subscription);
  const reason = whyCritical(subscription);
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        critical
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-card",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">
            {subscription.name || subscription.provider || "Subscription"}
          </p>
          {critical && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              Critical
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {subscription.billingCycle
            ? `${subscription.billingCycle} · `
            : ""}
          {subscription.provider ||
            (subscription as SubscriptionWithGeo).emailSender ||
            "Unknown source"}
        </p>
        {subscription.serviceLocationLabel && (
          <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {subscription.serviceLocationLabel}
          </p>
        )}
        {critical && reason && (
          <p className="text-[11px] text-destructive mt-1">{reason}</p>
        )}
      </div>
      <p className="font-mono text-sm tabular-nums shrink-0">
        {formatMoney(subscription.amount)}
      </p>
    </li>
  );
}

function whyCritical(sub: Subscription): string | null {
  if (!isCriticalSubscription(sub)) return null;
  const s = sub as SubscriptionWithGeo;
  if (!s.lastNearVisitAt) {
    return "We've never tracked you near this service location.";
  }
  const days = Math.floor(
    (Date.now() - new Date(s.lastNearVisitAt).getTime()) / 86_400_000,
  );
  return `No visits near here in ${days} days.`;
}

function OverviewCard({
  totalDue,
  unpaidCount,
}: {
  totalDue: number;
  unpaidCount: number;
}) {
  // When everything's paid, the panel celebrates with a green "all paid"
  // state. Otherwise it surfaces the total balance owed across every
  // unpaid bill so the user sees the full picture at a glance.
  const allPaid = unpaidCount === 0;

  if (allPaid) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/10">
        <CardContent className="p-6 text-center space-y-2">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <Check className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
            Overview
          </p>
          <p className="font-serif text-xl font-medium text-emerald-800 dark:text-emerald-300">
            All bills paid
          </p>
          <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">
            Nothing is owed right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-foreground/15">
      <CardContent className="p-5 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
            Overview
          </p>
          <h2 className="font-serif text-xl font-medium mt-1">
            Total bill amount to be paid
          </h2>
        </div>
        <div>
          <p className="font-mono text-4xl tracking-tight">
            {formatMoney(totalDue)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Across {unpaidCount} unpaid bill{unpaidCount === 1 ? "" : "s"}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// BottomTabBar / BOTTOM_TABS moved to components/app-shell.tsx so every
// page renders the same tab bar via <AppShell>.
export { BottomTabBar } from "@/components/app-shell";

export function SimpleStatementShortcut() {
  return (
    <Link href="/statement">
      <a className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        View full statement <ArrowRight className="h-3 w-3" />
      </a>
    </Link>
  );
}
