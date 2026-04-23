import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  Clock,
  Upload,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/react";

export default function BillDetail() {
  const [, params] = useRoute("/bills/:id");
  const billId = params?.id;
  const api = useApiClient();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const [showPayment, setShowPayment] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bills", billId],
    queryFn: () => api.get(`/bills/${billId}`),
    enabled: !!billId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["bills", billId, "payments"],
    queryFn: () => api.get(`/bills/${billId}/payments`),
    enabled: !!billId,
  });

  const approveBill = useMutation({
    mutationFn: () => api.post(`/bills/${billId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: "Bill approved" });
      setShowApproveConfirm(false);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const rejectBill = useMutation({
    mutationFn: (reason: string) => api.post(`/bills/${billId}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: "Bill rejected" });
      setShowRejectDialog(false);
      setRejectReason("");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const logPayment = useMutation({
    mutationFn: (data: any) => api.post(`/bills/${billId}/payments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["bills", billId, "payments"] });
      setShowPayment(false);
      toast({ title: "Payment recorded" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-6 text-muted-foreground">Loading...</div>
      </AppShell>
    );
  }

  if (!bill) {
    return (
      <AppShell>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Bill not found</p>
          <Link href="/bills"><Button variant="outline" className="mt-4">Back to Bills</Button></Link>
        </div>
      </AppShell>
    );
  }

  const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
  const remaining = parseFloat(bill.amount || 0) - totalPaid;

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back + Header */}
        <div>
          <Link href="/bills">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground mb-3 -ml-2">
              <ArrowLeft size={15} /> Bills
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{bill.title}</h1>
              {bill.category && (
                <span className="text-sm text-muted-foreground mt-1 inline-block">{bill.category}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={bill.status} />
              {bill.status === "pending_approval" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle size={14} className="mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowApproveConfirm(true)}
                  >
                    <CheckCircle size={14} className="mr-1" /> Approve
                  </Button>
                </>
              )}
              {(bill.status === "approved" || (bill.status === "paid" && remaining > 0)) && (
                <Button size="sm" onClick={() => setShowPayment(true)}>
                  <DollarSign size={14} className="mr-1" /> Record Payment
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main details */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bill Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow icon={<DollarSign size={15} />} label="Amount" value={`$${parseFloat(bill.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                {bill.due_date && <DetailRow icon={<Calendar size={15} />} label="Due Date" value={new Date(bill.due_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} />}
                {bill.frequency && <DetailRow icon={<Clock size={15} />} label="Frequency" value={formatLabel(bill.frequency)} />}
                {bill.notes && <DetailRow icon={<FileText size={15} />} label="Notes" value={bill.notes} />}
                {bill.rejectionReason && (
                  <DetailRow icon={<XCircle size={15} className="text-destructive" />} label="Rejection Reason" value={bill.rejectionReason} />
                )}
              </CardContent>
            </Card>

            {/* Payment history */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Payment History</CardTitle>
                {(bill.status === "approved" || (bill.status === "paid" && remaining > 0)) && (
                  <Button size="sm" variant="outline" onClick={() => setShowPayment(true)}>
                    <Upload size={14} className="mr-1" /> Record
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <DollarSign size={28} className="mx-auto mb-2 opacity-30" />
                    No payments recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">
                            ${parseFloat(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.paid_at || p.created_at).toLocaleDateString()} 
                            {p.method && ` · ${formatLabel(p.method)}`}
                          </p>
                        </div>
                        {p.receipt_url ? (
                          <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <FileText size={12} /> Receipt
                          </a>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> No receipt
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    ${parseFloat(bill.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total amount</p>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (totalPaid / parseFloat(bill.amount || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-sm font-semibold text-green-600">
                          ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Paid</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          ${Math.max(0, remaining).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {bill.created_at && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium mt-0.5">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </p>
                  {bill.approved_at && (
                    <>
                      <p className="text-xs text-muted-foreground mt-2">Approved</p>
                      <p className="text-sm font-medium mt-0.5">
                        {new Date(bill.approved_at).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Payment dialog */}
      <RecordPaymentDialog
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSubmit={(d) => logPayment.mutate(d)}
        loading={logPayment.isPending}
        billAmount={parseFloat(bill.amount || 0)}
      />

      {/* Approve confirm */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Bill?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Approve "{bill.title}" for ${parseFloat(bill.amount || 0).toFixed(2)}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveConfirm(false)}>Cancel</Button>
            <Button onClick={() => approveBill.mutate()} disabled={approveBill.isPending}>
              {approveBill.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={(open) => { setShowRejectDialog(open); if (!open) setRejectReason(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Bill?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Provide a reason for rejecting "{bill.title}".
          </p>
          <div>
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter a reason (optional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectBill.mutate(rejectReason)}
              disabled={rejectBill.isPending}
            >
              {rejectBill.isPending ? "Rejecting..." : "Reject Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function RecordPaymentDialog({
  open, onClose, onSubmit, loading, billAmount,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (d: any) => void;
  loading: boolean;
  billAmount: number;
}) {
  const [form, setForm] = useState({
    amount: String(billAmount),
    method: "bank_transfer",
    paid_at: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ ...form, amount: parseFloat(form.amount) });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.paid_at}
                onChange={(e) => set("paid_at", e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Payment Method</Label>
            <select
              value={form.method}
              onChange={(e) => set("method", e.target.value)}
              className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="auto_pay">Auto Pay</option>
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
            <AlertTriangle size={12} className="inline mr-1" />
            Caregiver/Other roles must upload a receipt. Receipt upload coming in documents section.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending_approval: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-blue-100 text-blue-700 border-blue-200",
    paid: "bg-green-100 text-green-700 border-green-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
    upcoming: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${variants[status] || "bg-gray-100 text-gray-600"}`}>
      {formatLabel(status)}
    </span>
  );
}

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
