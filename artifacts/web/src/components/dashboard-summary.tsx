import { ReactNode } from "react";
import { useGetDashboard, useListSubscriptions } from "@workspace/api-client-react";
import { ShieldAlert, Wallet, CreditCard, TrendingDown, RefreshCw, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function StatCell({
  label,
  icon,
  value,
  hint,
  valueTone = "default",
}: {
  label: string;
  icon: ReactNode;
  value: string;
  hint: string;
  valueTone?: "default" | "destructive";
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div
        className={cn(
          "font-mono text-[1.6rem] leading-none font-medium tabular-nums",
          valueTone === "destructive" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </div>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

export function DashboardSummaryCards() {
  const { data: summary, isLoading } = useGetDashboard();
  const { data: subscriptions = [] } = useListSubscriptions();

  const activeSubscriptions = subscriptions.filter((s) => !s.dismissed);
  const subMonthly = activeSubscriptions.reduce((sum, s) => {
    if (s.billingCycle === "yearly") return sum + s.amount / 12;
    if (s.billingCycle === "weekly") return sum + s.amount * 4;
    return sum + s.amount;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Subscription alert banner */}
      {activeSubscriptions.length > 0 && (
        <Alert className="border-border bg-muted/40">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <AlertTitle className="text-sm font-medium text-foreground">
            {activeSubscriptions.length} recurring subscription{activeSubscriptions.length !== 1 ? "s" : ""} detected
            {subMonthly > 0 && ` · ~$${subMonthly.toFixed(2)}/mo`}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              Review and cancel any you no longer need to save money.
            </span>
            <Link href="/subscriptions">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                View Subscriptions
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md border overflow-hidden">
        <StatCell
          label="Unpaid Total"
          icon={<Wallet className="h-3.5 w-3.5 text-muted-foreground" />}
          value={`$${summary.unpaidTotal.toFixed(2)}`}
          hint={`$${summary.totalMonthlyBills.toFixed(2)} total monthly bills`}
        />
        <StatCell
          label="Critical Risks"
          icon={<ShieldAlert className={`h-3.5 w-3.5 ${summary.highRiskCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />}
          value={String(summary.highRiskCount)}
          valueTone={summary.highRiskCount > 0 ? "destructive" : "default"}
          hint="High risk or critical bills"
        />
        <StatCell
          label="Avoidable Fees"
          icon={<TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />}
          value={`$${summary.avoidableFees.toFixed(2)}`}
          hint="Potential late fees at risk"
        />
        <StatCell
          label="Due This Week"
          icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
          value={String(summary.dueThisWeek)}
          hint="Upcoming in next 7 days"
        />
      </div>
    </div>
  );
}
