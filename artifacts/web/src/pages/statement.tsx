import { useState } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { useListBills, useGetDashboard } from "@workspace/api-client-react";

export function StatementPage() {
  const { data: bills = [] } = useListBills();
  const { data: dashboard } = useGetDashboard();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthBills = bills
    .filter((b) => {
      const d = parseISO(b.dueDate);
      return d >= monthStart && d <= monthEnd;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalDue = monthBills.reduce((s, b) => s + b.amount, 0);
  const paid = monthBills.filter((b) => b.status === "paid");
  const paidTotal = paid.reduce((s, b) => s + b.amount, 0);
  const upcoming = monthBills.filter((b) => b.status !== "paid");
  const upcomingTotal = upcoming.reduce((s, b) => s + b.amount, 0);
  const highRisk = monthBills.filter(
    (b) => b.riskLevel === "high" || b.riskLevel === "critical",
  );

  return (
    <AppShell bare back="/settings">
      {/* Screen-only month + print controls */}
      <div className="print:hidden border-b border-border bg-sidebar">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="h-9 w-9"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="h-9 text-xs uppercase tracking-[0.12em]"
          >
            {format(cursor, "MMMM yyyy")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="h-9 w-9"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={() => window.print()} className="gap-2 h-9 ml-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Statement document */}
      <article className="max-w-4xl mx-auto px-6 py-10 pb-24 print:py-6 print:max-w-none print:px-8">
        <header className="border-b border-foreground pb-4 mb-8 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              Kindue Household Ledger · Monthly Statement
            </div>
            <h1 className="font-serif text-4xl font-medium tracking-tight mt-2">
              {format(cursor, "MMMM yyyy")}
            </h1>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <div className="uppercase tracking-[0.14em]">Generated</div>
            <div className="font-mono tabular-nums">
              {format(new Date(), "yyyy-MM-dd HH:mm")}
            </div>
          </div>
        </header>

        {/* Summary */}
        <section className="mb-10">
          <h2 className="font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Summary
          </h2>
          <div className="border border-foreground/20 divide-y divide-foreground/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-foreground/20">
              <StatCell label="Bills this month" value={monthBills.length.toString()} mono />
              <StatCell label="Total due" value={`$${totalDue.toFixed(2)}`} mono />
              <StatCell label="Paid" value={`$${paidTotal.toFixed(2)}`} mono />
              <StatCell
                label="Upcoming"
                value={`$${upcomingTotal.toFixed(2)}`}
                mono
                emphasize
              />
            </div>
            {dashboard && (
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-foreground/20">
                <StatCell label="High-risk bills" value={highRisk.length.toString()} danger />
                <StatCell
                  label="Avoidable fees"
                  value={`$${dashboard.avoidableFees.toFixed(2)}`}
                  mono
                  danger={dashboard.avoidableFees > 0}
                />
                <StatCell
                  label="Due this week"
                  value={dashboard.dueThisWeek.toString()}
                />
                <StatCell
                  label="Subscriptions"
                  value={`$${dashboard.subscriptionsTotal.toFixed(2)}`}
                  mono
                />
              </div>
            )}
          </div>
        </section>

        {/* Bill register */}
        <section>
          <h2 className="font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Bill Register
          </h2>
          {monthBills.length === 0 ? (
            <p className="text-sm text-muted-foreground italic border border-dashed border-border rounded-md p-8 text-center">
              No bills recorded for this month.
            </p>
          ) : (
            <table className="w-full border border-foreground/20 text-sm">
              <thead>
                <tr className="border-b-2 border-foreground/60 bg-muted/30 print:bg-white">
                  <Th>Due</Th>
                  <Th>Provider</Th>
                  <Th>Category</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                  <Th>Risk</Th>
                </tr>
              </thead>
              <tbody>
                {monthBills.map((bill, idx) => (
                  <tr
                    key={bill.id}
                    className={`border-b border-foreground/10 last:border-b-0 ${
                      idx % 2 === 1 ? "bg-muted/20 print:bg-white" : ""
                    }`}
                  >
                    <Td mono>{format(parseISO(bill.dueDate), "yyyy-MM-dd")}</Td>
                    <Td className="font-medium">{bill.name}</Td>
                    <Td className="capitalize text-muted-foreground">{bill.category}</Td>
                    <Td mono align="right" className="font-medium">
                      ${bill.amount.toFixed(2)}
                    </Td>
                    <Td className="capitalize">{bill.status}</Td>
                    <Td
                      className={
                        bill.riskLevel === "high" || bill.riskLevel === "critical"
                          ? "text-destructive font-semibold capitalize"
                          : "text-muted-foreground capitalize"
                      }
                    >
                      {bill.riskLevel}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground/60 bg-muted/30 print:bg-white">
                  <Td colSpan={3} className="uppercase tracking-[0.14em] text-[10px] font-semibold">
                    Total
                  </Td>
                  <Td mono align="right" className="font-semibold">
                    ${totalDue.toFixed(2)}
                  </Td>
                  <Td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        {/* High-risk callout */}
        {highRisk.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Attention Required
            </h2>
            <ul className="border border-destructive/40 bg-destructive/5 print:border-foreground print:bg-white rounded-md divide-y divide-destructive/20 print:divide-foreground/20">
              {highRisk.map((b) => (
                <li key={b.id} className="p-3 text-sm flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {b.riskReasons.join(" · ")}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-mono tabular-nums font-semibold">
                      ${b.amount.toFixed(2)}
                    </div>
                    <div className="font-mono tabular-nums text-xs text-muted-foreground">
                      {format(parseISO(b.dueDate), "yyyy-MM-dd")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-12 pt-4 border-t border-foreground/30 text-[11px] text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span className="font-serif italic">
            Kindue · Household financial protection
          </span>
          <span className="uppercase tracking-[0.14em]">
            Detected from allow-listed provider domains only
          </span>
        </footer>
      </article>
    </AppShell>
  );
}

function StatCell({
  label,
  value,
  mono,
  emphasize,
  danger,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasize?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1.5 ${mono ? "font-mono tabular-nums" : ""} ${
          emphasize ? "text-2xl font-semibold" : "text-xl font-medium"
        } ${danger ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground border-r border-foreground/20 last:border-r-0 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  align?: "right";
  mono?: boolean;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-2 border-r border-foreground/10 last:border-r-0 ${
        align === "right" ? "text-right" : ""
      } ${mono ? "font-mono tabular-nums" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
