import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Plus, Search, Filter, FileText, ChevronRight, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Housing", "Utilities", "Insurance", "Medical", "Subscription", "Food", "Transportation", "Other"];
const FREQUENCIES = ["one_time", "weekly", "monthly", "quarterly", "annual"];
const STATUSES = ["upcoming", "pending_approval", "approved", "paid", "overdue"];

export default function Bills() {
  const api = useApiClient();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["bills"],
    queryFn: () => api.get("/bills"),
  });

  const { data: household } = useQuery({
    queryKey: ["household"],
    queryFn: () => api.get("/households/mine"),
  });

  const createBill = useMutation({
    mutationFn: (data: any) => api.post("/bills", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setShowCreate(false);
      toast({ title: "Bill created", description: "The new bill has been added." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const filtered = bills.filter((b: any) => {
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bills</h1>
            <p className="text-muted-foreground text-sm mt-1">{bills.length} total bills</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={16} /> Add Bill
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter size={14} className="mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bills list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading bills...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">No bills found</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
                Add your first bill
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((bill: any) => (
              <Link key={bill.id} href={`/bills/${bill.id}`}>
                <Card className="cursor-pointer hover:shadow-sm transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">{bill.title}</h3>
                          {bill.category && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                              {bill.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {bill.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(bill.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {bill.frequency && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {formatLabel(bill.frequency)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold text-foreground">
                          ${parseFloat(bill.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <StatusBadge status={bill.status} />
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <CreateBillDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createBill.mutate(data)}
        loading={createBill.isPending}
      />
    </AppShell>
  );
}

function CreateBillDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    due_date: "",
    category: "",
    frequency: "one_time",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
    });
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Bill Name *</Label>
            <Input
              id="title"
              placeholder="e.g., Electric bill"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>{formatLabel(f)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${variants[status] || "bg-gray-100 text-gray-600"}`}>
      {formatLabel(status)}
    </span>
  );
}

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
