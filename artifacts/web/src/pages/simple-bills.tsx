import { useMemo, useState } from "react";
import {
  useUpdateBill,
  useScanGmail,
  BillStatus,
  BillCategory,
  type Bill,
} from "@workspace/api-client-react";
import { useBills, useInvalidateHouseholdData } from "@/lib/api-hooks";
import { useActiveHousehold } from "@/lib/active-household";
import { Link, useLocation } from "wouter";
import {
  Check,
  Calendar,
  AlertTriangle,
  Loader2,
  Building2,
  FileText,
  Zap,
  ScanLine,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { useScanCapability } from "@/hooks/use-scan-capability";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<BillCategory, string> = {
  housing: "Housing",
  utility: "Utility",
  loan: "Loan",
  insurance: "Insurance",
  credit: "Credit card",
  subscription: "Subscription",
  phone: "Phone",
  childcare: "Childcare",
  other: "Other",
};

const STATUS_LABELS: Record<BillStatus, string> = {
  unpaid: "Unpaid",
  scheduled: "Scheduled",
  paid: "Paid",
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(dueDateIso: string | Date): number {
  const due = new Date(dueDateIso);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000);
}

function formatDueLabel(days: number, status: BillStatus): string {
  if (status === "paid") return "Paid";
  if (days < 0)
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function dueTone(days: number, status: BillStatus): string {
  if (status === "paid") return "text-muted-foreground";
  if (days <= 0) return "text-destructive";
  if (days <= 7) return "text-foreground";
  return "text-muted-foreground";
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatLongDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function SimpleBills() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { householdId } = useActiveHousehold();
  const invalidate = useInvalidateHouseholdData();
  const { data: bills, isLoading } = useBills();
  const { canScan } = useScanCapability();
  const [selected, setSelected] = useState<Bill | null>(null);

  // Scan every linked account (mail inboxes today, financial accounts
  // when those connectors come online) for new bills. The standalone
  // "Scan" page (linked below) is where the user manages which accounts
  // are connected.
  const scanBills = useScanGmail({
    mutation: {
      onSuccess: (data) => {
        invalidate();
        toast({
          title: "Scan complete",
          description:
            data.found === 0
              ? "No new bills found across your linked accounts."
              : `${data.found} bill${data.found === 1 ? "" : "s"} found · ${data.newlyAdded} need review.`,
        });
      },
      onError: (err: { message?: string }) =>
        toast({
          title: "Couldn't scan",
          description:
            err?.message ??
            "We couldn't reach your linked accounts. Try again in a moment.",
          variant: "destructive",
        }),
    },
  });

  // Bills are split into "Outstanding" (anything not paid yet, sorted by
  // due date so the next one is on top) and "Paid" (most recently paid
  // first). This keeps the page useful as both a to-do list and a record.
  const { outstanding, paid } = useMemo(() => {
    const list = bills ?? [];
    const out = list
      .filter((b) => b.status !== BillStatus.paid)
      .sort((a, b) =>
        String(a.dueDate).localeCompare(String(b.dueDate)),
      );
    const pd = list
      .filter((b) => b.status === BillStatus.paid)
      .sort((a, b) =>
        String(b.dueDate).localeCompare(String(a.dueDate)),
      );
    return { outstanding: out, paid: pd };
  }, [bills]);

  const totalDue = useMemo(
    () => outstanding.reduce((s, b) => s + b.amount, 0),
    [outstanding],
  );

  return (
    <AppShell>
      <>
        {/* Scan controls — placed right under the top banner so the
            primary action is the first thing the user sees on this tab.
            Caregiver / view-only roles can't trigger a scan server-side,
            so we disable the button (with an explanatory tooltip) and
            surface a small notice instead of letting the click 403.
            While capability is still loading (`canScan === undefined`)
            we render a neutral disabled button so an early click can't
            slip through and 403 — but no view-only banner yet, so we
            don't flash it at admins. */}
        {canScan === undefined ? (
          <div className="space-y-2">
            <Button
              variant="outline"
              disabled
              className="w-full h-12 gap-2 uppercase tracking-[0.14em] font-semibold"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </Button>
          </div>
        ) : canScan ? (
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() =>
                householdId != null && scanBills.mutate({ householdId })
              }
              disabled={scanBills.isPending || householdId == null}
              className="w-full h-12 gap-2 uppercase tracking-[0.14em] font-semibold"
            >
              {scanBills.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              {scanBills.isPending
                ? "Scanning all linked accounts…"
                : "Scan Bills"}
            </Button>
            <button
              type="button"
              onClick={() => setLocation("/scan")}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
            >
              Manage linked mail & financial accounts
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                {/* Wrapper span — disabled buttons don't fire pointer
                    events, so the tooltip needs an enabled trigger. */}
                <TooltipTrigger asChild>
                  <span className="block w-full" tabIndex={0}>
                    <Button
                      variant="outline"
                      disabled
                      aria-disabled
                      className="w-full h-12 gap-2 uppercase tracking-[0.14em] font-semibold pointer-events-none"
                    >
                      <ScanLine className="h-4 w-4" />
                      Scan Bills
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Only the household admin can scan inboxes.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ViewOnlyNotice variant="inline" className="justify-center w-full" />
          </div>
        )}

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Bills
          </p>
          <h1 className="font-serif text-2xl font-medium mt-1">
            All your bills
          </h1>
          {outstanding.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {outstanding.length} outstanding ·{" "}
              <span className="font-medium text-foreground">
                {formatMoney(totalDue)}
              </span>{" "}
              owed
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <BillSection
              title="Outstanding"
              bills={outstanding}
              emptyText={
                canScan === false
                  ? "No bills to show yet. Once the household admin runs a scan, anything they find will appear here."
                  : "Nothing outstanding. You're all caught up."
              }
              onSelect={setSelected}
            />
            {paid.length > 0 && (
              <BillSection
                title="Paid"
                bills={paid}
                emptyText=""
                onSelect={setSelected}
              />
            )}
          </>
        )}
      </>

      <BillDetailsDialog
        bill={selected}
        onClose={() => setSelected(null)}
      />
    </AppShell>
  );
}

function BillSection({
  title,
  bills,
  emptyText,
  onSelect,
}: {
  title: string;
  bills: Bill[];
  emptyText: string;
  onSelect: (b: Bill) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg font-medium px-1">{title}</h2>
      {bills.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bills.map((b) => (
            <BillRow key={b.id} bill={b} onClick={() => onSelect(b)} />
          ))}
        </div>
      )}
    </section>
  );
}

function hasFinancialConsequence(bill: Bill): boolean {
  // The caution sign is reserved for bills where missing the due date
  // actually costs the user something — a service shutoff, a late fee,
  // or a high-interest accrual. Simply being overdue is not enough.
  return (
    bill.shutoffRisk === true ||
    (typeof bill.lateFee === "number" && bill.lateFee > 0) ||
    bill.riskLevel === "high" ||
    bill.riskLevel === "critical"
  );
}

function BillRow({ bill, onClick }: { bill: Bill; onClick: () => void }) {
  const days = daysFromToday(bill.dueDate);
  const label = formatDueLabel(days, bill.status);
  const tone = dueTone(days, bill.status);
  const urgent = bill.status !== "paid" && hasFinancialConsequence(bill);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${bill.name} details`}
      className={
        "w-full text-left flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (urgent ? "border-destructive/40 bg-destructive/5" : "border-border")
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-medium truncate">{bill.name}</p>
          {urgent && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
        </div>
        <p className={`text-xs mt-0.5 ${tone}`}>
          {label}
          {bill.category && (
            <>
              {" · "}
              <span className="text-muted-foreground">
                {CATEGORY_LABELS[bill.category]}
              </span>
            </>
          )}
        </p>
      </div>
      <p className="font-mono text-base tabular-nums shrink-0">
        {formatMoney(bill.amount)}
      </p>
    </button>
  );
}

function BillDetailsDialog({
  bill,
  onClose,
}: {
  bill: Bill | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { householdId } = useActiveHousehold();
  const invalidate = useInvalidateHouseholdData();
  const updateBill = useUpdateBill();

  // shutoffRisk in the data model is a flag, not a date. When the bill is
  // flagged we surface the due date as the practical "service stops on"
  // date, since that's when the provider would act. If a real shutoff
  // date field is added later it can replace this here.
  const days = bill ? daysFromToday(bill.dueDate) : 0;
  const isPaid = bill?.status === "paid";

  const handleMarkPaid = () => {
    if (!bill?.id || householdId == null) return;
    updateBill.mutate(
      { householdId, billId: bill.id, data: { status: BillStatus.paid } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Marked as paid" });
          onClose();
        },
        onError: (err: { message?: string }) => {
          toast({
            title: "Couldn't update",
            description: err?.message ?? "Try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={!!bill} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        {bill && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="font-serif text-xl truncate">
                    {bill.name}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {STATUS_LABELS[bill.status]} ·{" "}
                    <span className="font-mono text-foreground">
                      {formatMoney(bill.amount)}
                    </span>
                  </DialogDescription>
                </div>
                {bill.shutoffRisk && !isPaid && (
                  <Badge variant="destructive" className="gap-1 shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                    Shutoff risk
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <DetailRow
                icon={Building2}
                label="Organization"
                value={
                  bill.emailSender?.trim() ||
                  CATEGORY_LABELS[bill.category] ||
                  "Not set"
                }
                hint={
                  bill.emailSender && bill.category
                    ? CATEGORY_LABELS[bill.category]
                    : undefined
                }
              />

              <DetailRow
                icon={Calendar}
                label="Due date"
                value={formatLongDate(bill.dueDate)}
                hint={!isPaid ? formatDueLabel(days, bill.status) : undefined}
              />

              {bill.shutoffRisk && !isPaid && (
                <DetailRow
                  icon={Zap}
                  label="Shutoff date"
                  value={formatLongDate(bill.dueDate)}
                  hint="Service may stop if unpaid by this date."
                />
              )}

              <DetailRow
                icon={FileText}
                label="Description"
                value={bill.notes?.trim() || "No description added."}
              />
            </div>

            {!isPaid && (
              <Button
                onClick={handleMarkPaid}
                disabled={updateBill.isPending}
                size="lg"
                className="w-full h-14 text-base gap-2 mt-2"
              >
                {updateBill.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                {updateBill.isPending ? "Saving…" : "Mark as paid"}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md border border-border p-1.5 bg-muted/40">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-sm mt-0.5 break-words whitespace-pre-wrap">
          {value}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        )}
      </div>
    </div>
  );
}
