import { format, parseISO } from "date-fns";
import { Check, X, Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useApproveBill,
  useRejectBill,
  type Bill,
} from "@workspace/api-client-react";
import { usePendingBills, useInvalidateHouseholdData } from "@/lib/api-hooks";
import { useActiveHousehold } from "@/lib/active-household";

function Row({ bill }: { bill: Bill }) {
  const { householdId } = useActiveHousehold();
  const invalidate = useInvalidateHouseholdData();
  const approve = useApproveBill();
  const reject = useRejectBill();

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center border-b border-border/70 last:border-b-0 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{bill.name}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium capitalize">
            {bill.category}
          </span>
          {(bill.riskLevel === "high" || bill.riskLevel === "critical") && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-destructive font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {bill.riskLevel}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
          <Mail className="w-3 h-3 shrink-0" />
          <span className="truncate">{bill.emailSender}</span>
        </div>
      </div>
      <div className="text-right whitespace-nowrap">
        <div className="font-mono tabular-nums text-sm font-medium">
          ${bill.amount.toFixed(2)}
        </div>
        <div className="font-mono tabular-nums text-[11px] text-muted-foreground">
          {format(parseISO(bill.dueDate), "yyyy-MM-dd")}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          disabled={reject.isPending}
          onClick={() => {
            if (householdId == null) return;
            reject.mutate(
              { householdId, billId: bill.id, data: { reason: "" } },
              { onSuccess: invalidate },
            );
          }}
          aria-label="Reject"
          title="Reject"
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className="h-8 w-8"
          disabled={approve.isPending}
          onClick={() => {
            if (householdId == null) return;
            approve.mutate(
              { householdId, billId: bill.id },
              { onSuccess: invalidate },
            );
          }}
          aria-label="Approve"
          title="Approve"
        >
          <Check className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function PendingReviewBanner({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const { data = [] } = usePendingBills();
  if (data.length === 0) return null;

  return (
    <div className="border border-foreground/20 bg-foreground/[0.03] rounded-md px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-foreground">
          {data.length} bill{data.length === 1 ? "" : "s"} awaiting review
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Gmail detected these. Confirm each before it enters your ledger.
        </div>
      </div>
      <Button variant="outline" onClick={onOpen} className="shrink-0 gap-2 h-9">
        Review detections
      </Button>
    </div>
  );
}

export function PendingReviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { householdId } = useActiveHousehold();
  const { data = [], isLoading } = usePendingBills();
  const invalidate = useInvalidateHouseholdData();
  const approve = useApproveBill();
  const reject = useRejectBill();

  const approveAll = async () => {
    if (householdId == null) return;
    await Promise.all(
      data.map((b) =>
        approve.mutateAsync({ householdId, billId: b.id }),
      ),
    );
    invalidate();
    onOpenChange(false);
  };

  const rejectAll = async () => {
    if (householdId == null) return;
    await Promise.all(
      data.map((b) =>
        reject.mutateAsync({
          householdId,
          billId: b.id,
          data: { reason: "" },
        }),
      ),
    );
    invalidate();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-medium tracking-tight">
            Review detected bills
          </DialogTitle>
          <DialogDescription>
            These were auto-detected from verified provider emails. Approve the ones
            you want to track; reject any that look wrong.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 border-y border-border py-1">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : data.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nothing pending. All detections have been reviewed.
            </div>
          ) : (
            data.map((bill) => <Row key={bill.id} bill={bill} />)
          )}
        </div>

        {data.length > 0 && (
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={rejectAll}
              disabled={reject.isPending || approve.isPending}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Reject all
            </Button>
            <Button
              onClick={approveAll}
              disabled={reject.isPending || approve.isPending}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Approve all
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
