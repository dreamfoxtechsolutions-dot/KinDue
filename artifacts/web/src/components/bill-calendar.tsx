import { useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListBills, type Bill } from "@workspace/api-client-react";
import { BillDetailSheet } from "./bill-detail-sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BillForm } from "./bill-form";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function riskDotClass(level: Bill["riskLevel"]): string {
  switch (level) {
    case "critical":
    case "high":
      return "bg-destructive";
    case "medium":
      return "bg-foreground/60";
    default:
      return "bg-foreground/30";
  }
}

export function BillCalendar() {
  const { data: bills = [] } = useListBills();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const billsByDay = new Map<string, Bill[]>();
  for (const bill of bills) {
    const key = bill.dueDate;
    if (!billsByDay.has(key)) billsByDay.set(key, []);
    billsByDay.get(key)!.push(bill);
  }

  const monthBills = bills.filter((b) => {
    const d = parseISO(b.dueDate);
    return d >= monthStart && d <= monthEnd;
  });
  const monthTotal = monthBills.reduce((s, b) => s + b.amount, 0);
  const monthHighRisk = monthBills.filter(
    (b) => b.riskLevel === "high" || b.riskLevel === "critical",
  ).length;

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            Calendar
          </div>
          <h2 className="font-serif text-2xl font-medium tracking-tight mt-1">
            {format(cursor, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Month total
            </div>
            <div className="font-mono tabular-nums text-sm mt-0.5">
              ${monthTotal.toFixed(2)} · {monthBills.length} bill{monthBills.length === 1 ? "" : "s"} ·{" "}
              <span className={monthHighRisk > 0 ? "text-destructive" : "text-muted-foreground"}>
                {monthHighRisk} high-risk
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor((c) => subMonths(c, 1))}
              aria-label="Previous month"
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="h-9 text-xs uppercase tracking-[0.12em]"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-border rounded-md overflow-hidden bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground text-center border-r border-border/70 last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, idx) => {
            const iso = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);
            const dayBills = billsByDay.get(iso) ?? [];
            const onLastCol = (idx + 1) % 7 === 0;
            const onLastRow = idx >= days.length - 7;
            return (
              <div
                key={iso}
                className={[
                  "min-h-[96px] p-2 text-xs",
                  !onLastCol && "border-r border-border/70",
                  !onLastRow && "border-b border-border/70",
                  inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground/60",
                  isToday ? "ring-1 ring-foreground/80 ring-inset" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`font-mono tabular-nums ${
                      isToday ? "font-semibold text-foreground" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {dayBills.length > 0 && (
                    <span className="font-mono tabular-nums text-[10px] text-muted-foreground">
                      {dayBills.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayBills.slice(0, 3).map((bill) => (
                    <button
                      key={bill.id}
                      onClick={() => setSelectedBill(bill)}
                      className="w-full text-left flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-muted transition-colors"
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${riskDotClass(
                          bill.riskLevel,
                        )}`}
                      />
                      <span className="truncate flex-1 text-[11px] font-medium">
                        {bill.name}
                      </span>
                      <span className="font-mono tabular-nums text-[10px] text-muted-foreground shrink-0">
                        ${bill.amount.toFixed(0)}
                      </span>
                    </button>
                  ))}
                  {dayBills.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayBills.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="uppercase tracking-[0.14em] font-medium">Risk:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" /> High / Critical
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" /> Medium
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/30" /> Low
        </span>
      </div>

      <BillDetailSheet
        bill={selectedBill}
        open={selectedBill !== null}
        onOpenChange={(o) => !o && setSelectedBill(null)}
        onEdit={(b) => setEditingBill(b)}
        onDelete={() => setSelectedBill(null)}
      />

      <Dialog open={editingBill !== null} onOpenChange={(o) => !o && setEditingBill(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {editingBill && (
            <BillForm
              bill={editingBill}
              onSuccess={() => setEditingBill(null)}
              onCancel={() => setEditingBill(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
