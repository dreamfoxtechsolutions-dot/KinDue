import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  useUpdateBill,
  useDeleteBill,
  BillStatus,
} from "@workspace/api-client-react";
import { useBills, useInvalidateHouseholdData } from "@/lib/api-hooks";
import { useActiveHousehold } from "@/lib/active-household";
import { useHouseholdMe } from "@/hooks/use-household";
import { can } from "@/lib/household-api";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, AlertTriangle, CheckCircle2, Circle, Edit2, Trash2, Mail } from "lucide-react";
import { BillForm } from "./bill-form";
import { BillDetailSheet } from "./bill-detail-sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function BillList({
  openBillId,
  onOpenedBill,
}: {
  openBillId?: number | null;
  onOpenedBill?: (id: number) => void;
} = {}) {
  const { householdId } = useActiveHousehold();
  const invalidate = useInvalidateHouseholdData();
  const { data: bills, isLoading } = useBills();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const household = useHouseholdMe().data;
  const canEdit = can(household, "edit_bill");
  const canDelete = can(household, "delete_bill");
  const canMarkPaid = can(household, "mark_paid");
  
  const [editingBillId, setEditingBillId] = useState<number | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<number | null>(null);
  const [detailBillId, setDetailBillId] = useState<number | null>(null);

  // Open the bill detail sheet when arriving via a notification deep link
  // like /?bill=42. We only act once per `openBillId` (tracked via ref) and
  // wait until the bills list has loaded so the deep-link doesn't race the
  // initial fetch. After opening we notify the parent so it can clean up
  // the URL — clearing the URL before the sheet actually opens caused a
  // race where the sheet never appeared.
  const handledOpenBillRef = useRef<number | null>(null);
  useEffect(() => {
    if (!openBillId || !bills) return;
    if (handledOpenBillRef.current === openBillId) return;
    if (bills.some((b) => b.id === openBillId)) {
      handledOpenBillRef.current = openBillId;
      setDetailBillId(openBillId);
      onOpenedBill?.(openBillId);
    }
  }, [openBillId, bills, onOpenedBill]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading bills...</div>;
  }

  if (!bills || bills.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-card/50">
        <p className="text-muted-foreground">No bills added yet.</p>
      </div>
    );
  }

  const markAsPaid = (id: number) => {
    if (householdId == null) return;
    updateBill.mutate(
      { householdId, billId: id, data: { status: BillStatus.paid } },
      {
        onSuccess: () => {
          invalidate();
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!deletingBillId || householdId == null) return;
    deleteBill.mutate(
      { householdId, billId: deletingBillId },
      {
        onSuccess: () => {
          invalidate();
          setDeletingBillId(null);
        },
      },
    );
  };

  const editingBill = bills.find(b => b.id === editingBillId);

  return (
    <>
      {/* Mobile card list */}
      <div className="flex flex-col gap-2 md:hidden">
        {bills.map((bill) => {
          const isHighRisk = bill.riskLevel === "high" || bill.riskLevel === "critical";
          return (
            <div
              key={bill.id}
              onClick={() => setDetailBillId(bill.id)}
              className="rounded-md border bg-card p-3 active:bg-muted/60 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm truncate">{bill.name}</span>
                    {bill.detectedFrom === "gmail" && (
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 font-normal text-muted-foreground shrink-0">
                        <Mail className="w-3 h-3" /> Gmail
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                    {bill.category} · Due {format(parseISO(bill.dueDate), "MMM d")}
                  </div>
                </div>
                <div className="flex items-start gap-1 shrink-0">
                  <div className="font-mono tabular-nums text-sm font-medium text-right">
                    ${bill.amount.toFixed(2)}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-7 w-7 p-0 -mt-1 -mr-1">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {canMarkPaid && bill.status !== "paid" && (
                          <DropdownMenuItem onClick={() => markAsPaid(bill.id)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => setEditingBillId(bill.id)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit Bill
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingBillId(bill.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="border-border bg-background text-[10px] capitalize font-normal py-0">
                  {bill.status}
                </Badge>
                {isHighRisk ? (
                  <Badge variant="destructive" className="flex items-center gap-1 text-[10px] font-normal py-0">
                    <AlertTriangle className="w-3 h-3" />
                    {bill.riskLevel}
                  </Badge>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground capitalize">
                    {bill.riskLevel} risk
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border bg-card overflow-hidden [&_td]:border-r [&_td]:border-border/70 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border/70 [&_th:last-child]:border-r-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50 border-b-2 border-border">
              <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">Bill</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground text-right">Amount</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">Due</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">Risk</TableHead>
              <TableHead className="h-9 w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill, idx) => (
              <TableRow
                key={bill.id}
                onClick={() => setDetailBillId(bill.id)}
                className={`cursor-pointer ${
                  idx % 2 === 1 ? "bg-muted/30 hover:bg-muted/60" : "hover:bg-muted/40"
                }`}
              >
                <TableCell className="py-2.5">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {bill.name}
                    {bill.detectedFrom === "gmail" && (
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 font-normal text-muted-foreground">
                        <Mail className="w-3 h-3" /> Gmail
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground capitalize mt-0.5">{bill.category}</div>
                </TableCell>
                <TableCell className="py-2.5 text-right font-mono tabular-nums text-sm font-medium">
                  ${bill.amount.toFixed(2)}
                </TableCell>
                <TableCell className="py-2.5 font-mono tabular-nums text-sm text-muted-foreground">
                  {format(parseISO(bill.dueDate), "yyyy-MM-dd")}
                </TableCell>
                <TableCell className="py-2.5">
                  <Badge
                    variant="outline"
                    className={
                      bill.status === 'paid'
                        ? 'border-border bg-background text-muted-foreground capitalize font-normal'
                        : bill.status === 'scheduled'
                          ? 'border-border bg-background text-foreground capitalize font-normal'
                          : 'border-border bg-background text-muted-foreground capitalize font-normal'
                    }
                  >
                    {bill.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-2.5">
                  {bill.riskLevel === 'high' || bill.riskLevel === 'critical' ? (
                    <Badge variant="destructive" className="flex w-fit items-center gap-1 font-normal">
                      <AlertTriangle className="w-3 h-3" />
                      {bill.riskLevel}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground capitalize">{bill.riskLevel}</span>
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {canMarkPaid && bill.status !== 'paid' && (
                        <DropdownMenuItem onClick={() => markAsPaid(bill.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setEditingBillId(bill.id)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit Bill
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingBillId(bill.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editingBillId !== null} onOpenChange={(open) => !open && setEditingBillId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {editingBill && (
            <BillForm 
              bill={editingBill} 
              onSuccess={() => setEditingBillId(null)} 
              onCancel={() => setEditingBillId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <BillDetailSheet
        bill={bills.find((b) => b.id === detailBillId) ?? null}
        open={detailBillId !== null}
        onOpenChange={(o) => !o && setDetailBillId(null)}
        onEdit={(b) => setEditingBillId(b.id)}
        onDelete={() => setDetailBillId(null)}
      />

      <AlertDialog open={deletingBillId !== null} onOpenChange={(open) => !open && setDeletingBillId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bill. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
