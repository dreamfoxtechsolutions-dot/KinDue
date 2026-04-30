import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { Banknote, Landmark, Pencil, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboard } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type LinkedInstitution = { id: string; connectedAt: string };

type CashflowMeta = {
  linkedInstitutions?: LinkedInstitution[];
  recurringIncome?: number;
  availableCash?: number;
};

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

export function FinanceSnapshot() {
  const { user, isLoaded } = useUser();
  const { data: summary } = useGetDashboard();
  const { toast } = useToast();

  const [recurringIncome, setRecurringIncome] = useState(0);
  const [availableCash, setAvailableCash] = useState(0);
  const [linked, setLinked] = useState<LinkedInstitution[]>([]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [incomeInput, setIncomeInput] = useState("");
  const [cashInput, setCashInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const md = (user.unsafeMetadata ?? {}) as CashflowMeta;
    setLinked(md.linkedInstitutions ?? []);
    setRecurringIncome(Number(md.recurringIncome ?? 0));
    setAvailableCash(Number(md.availableCash ?? 0));
  }, [user]);

  const openEdit = () => {
    setIncomeInput(recurringIncome ? String(recurringIncome) : "");
    setCashInput(availableCash ? String(availableCash) : "");
    setIsEditOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const parsedIncome = parseFloat(incomeInput || "0");
    const parsedCash = parseFloat(cashInput || "0");
    if (
      Number.isNaN(parsedIncome) ||
      Number.isNaN(parsedCash) ||
      parsedIncome < 0 ||
      parsedCash < 0
    ) {
      toast({
        title: "Invalid amount",
        description: "Please enter positive numbers for income and cash.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const prev = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
      await user.update({
        unsafeMetadata: {
          ...prev,
          recurringIncome: parsedIncome,
          availableCash: parsedCash,
        },
      });
      setRecurringIncome(parsedIncome);
      setAvailableCash(parsedCash);
      setIsEditOpen(false);
      toast({ title: "Snapshot updated" });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const runway = useMemo(() => {
    const unpaid = summary?.unpaidTotal ?? 0;
    if (availableCash <= 0) return null;
    if (unpaid <= 0) return "Fully funded";
    const pct = Math.min(100, Math.round((availableCash / unpaid) * 100));
    return `${pct}% of unpaid bills covered`;
  }, [availableCash, summary]);

  const netThisMonth = useMemo(() => {
    const unpaid = summary?.unpaidTotal ?? 0;
    return recurringIncome - unpaid;
  }, [recurringIncome, summary]);

  if (!isLoaded) {
    return <Skeleton className="h-[160px] w-full rounded-md" />;
  }

  const hasLinked = linked.length > 0;

  return (
    <>
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="font-serif text-base tracking-tight">
              Cashflow Snapshot
            </h3>
          </div>
          {hasLinked && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={openEdit}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>

        {!hasLinked ? (
          <div className="flex flex-col items-start gap-3 px-5 py-6">
            <p className="text-sm text-muted-foreground max-w-prose">
              Link a financial account to see your recurring income and
              available cash here alongside your bills.
            </p>
            <Link href="/scan">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Link an account
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-0 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
                  Recurring Income
                </span>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="font-mono text-[1.6rem] leading-none font-medium tabular-nums text-foreground">
                {formatCurrency(recurringIncome)}
              </div>
              <span className="text-xs text-muted-foreground">
                {recurringIncome > 0
                  ? `Net this month: ${netThisMonth >= 0 ? "+" : "-"}${formatCurrency(Math.abs(netThisMonth))}`
                  : "Tap Edit to add your monthly income."}
              </span>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
                  Available Cash
                </span>
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="font-mono text-[1.6rem] leading-none font-medium tabular-nums text-foreground">
                {formatCurrency(availableCash)}
              </div>
              <span className="text-xs text-muted-foreground">
                {availableCash > 0
                  ? (runway ?? "")
                  : "Tap Edit to record your liquid balance."}
              </span>
            </div>
          </div>
        )}

        {hasLinked && (
          <div className="px-5 py-2.5 border-t border-border bg-muted/30">
            <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground flex items-center gap-1.5">
              <Banknote className="h-3 w-3" />
              {linked.length} account{linked.length !== 1 ? "s" : ""} linked ·
              Values are self-reported until provider sync is enabled.
            </span>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Update cashflow snapshot
            </DialogTitle>
            <DialogDescription>
              Enter your current monthly recurring income and liquid cash on
              hand. These values live on your profile and update the dashboard
              instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income">Recurring monthly income ($)</Label>
              <Input
                id="income"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cash">Available cash ($)</Label>
              <Input
                id="cash"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
