import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboard, useBills } from "@/lib/api-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ShieldAlert, TrendingDown, CalendarClock } from "lucide-react";
import type { ReactNode } from "react";

type Slice = {
  key: "critical" | "high" | "medium" | "low";
  label: string;
  value: number;
  color: string;
};

const RISK_COLORS: Record<Slice["key"], string> = {
  critical: "hsl(0 72% 42%)",
  high: "hsl(25 85% 48%)",
  medium: "hsl(42 90% 48%)",
  low: "hsl(142 45% 38%)",
};

function KpiRow({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <span
        className={`font-mono text-sm tabular-nums ${
          tone === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function DashboardChart() {
  const { data: summary, isLoading } = useDashboard();
  const { data: bills = [] } = useBills();

  const slices = useMemo<Slice[]>(() => {
    if (!summary) return [];
    const rb = summary.riskBreakdown;
    return (
      [
        { key: "critical", label: "Critical", value: rb.critical, color: RISK_COLORS.critical },
        { key: "high", label: "High risk", value: rb.high, color: RISK_COLORS.high },
        { key: "medium", label: "Medium", value: rb.medium, color: RISK_COLORS.medium },
        { key: "low", label: "Low / paid", value: rb.low, color: RISK_COLORS.low },
      ] as Slice[]
    ).filter((s) => s.value > 0);
  }, [summary]);

  const totalBills = bills.length;

  if (isLoading) {
    return <Skeleton className="h-[260px] w-full rounded-md" />;
  }
  if (!summary) return null;

  const hasData = slices.length > 0;

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border">
        <div>
          <h3 className="font-serif text-base tracking-tight">
            Household Risk Overview
          </h3>
          <p className="text-xs text-muted-foreground">
            Live breakdown of your bills by risk level and exposure.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
          {totalBills} bill{totalBills !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] p-5">
        {/* Pie */}
        <div className="relative h-[220px]">
          {hasData ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} bill${value !== 1 ? "s" : ""}`,
                      name,
                    ]}
                  />
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {slices.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-2xl tabular-nums text-foreground">
                  {totalBills}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                  Bills tracked
                </span>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <div className="h-20 w-20 rounded-full border-2 border-dashed border-border" />
              <span className="text-xs">
                No bills tracked yet. Add or scan bills to see your risk mix.
              </span>
            </div>
          )}
        </div>

        {/* Legend + KPIs */}
        <div className="flex flex-col gap-4">
          {hasData && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {slices.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {s.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col">
            <KpiRow
              icon={<Wallet className="h-3.5 w-3.5" />}
              label="Unpaid total"
              value={`$${summary.unpaidTotal.toFixed(2)}`}
            />
            <KpiRow
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              label="Critical risks"
              value={String(summary.highRiskCount)}
              tone={summary.highRiskCount > 0 ? "destructive" : "default"}
            />
            <KpiRow
              icon={<TrendingDown className="h-3.5 w-3.5" />}
              label="Avoidable fees"
              value={`$${summary.avoidableFees.toFixed(2)}`}
              tone={summary.avoidableFees > 0 ? "destructive" : "default"}
            />
            <KpiRow
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              label="Due this week"
              value={String(summary.dueThisWeek)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
