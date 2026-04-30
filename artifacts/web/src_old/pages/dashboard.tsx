import { useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  AlertTriangle,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useUser();
  const api = useApiClient();

  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: () => api.get("/bills"),
  });

  const { data: triage = [] } = useQuery({
    queryKey: ["triage"],
    queryFn: () => api.get("/triage"),
  });

  const pendingBills = bills.filter((b: any) => b.status === "pending_approval");
  const overdueBills = bills.filter((b: any) => b.status === "overdue");
  const upcomingBills = bills.filter((b: any) => b.status === "upcoming");
  const paidThisMonth = bills.filter((b: any) => b.status === "paid");

  const totalMonthlyDue = bills
    .filter((b: any) => ["upcoming", "pending_approval", "overdue"].includes(b.status))
    .reduce((sum: number, b: any) => sum + parseFloat(b.amount || 0), 0);

  const highRiskCount = triage.filter((t: any) => t.risk === "high").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {user?.firstName || "there"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with your household finances today.
          </p>
        </div>

        {/* Alert banner for high-risk items */}
        {(overdueBills.length > 0 || highRiskCount > 0) && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="text-destructive shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Attention needed:{" "}
                {overdueBills.length > 0 && `${overdueBills.length} overdue bill${overdueBills.length > 1 ? "s" : ""}`}
                {overdueBills.length > 0 && highRiskCount > 0 && " and "}
                {highRiskCount > 0 && `${highRiskCount} high-risk item${highRiskCount > 1 ? "s" : ""}`}
              </p>
            </div>
            <Link href="/triage">
              <Button variant="destructive" size="sm">Review</Button>
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Due This Month</span>
                <DollarSign size={16} className="text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${totalMonthlyDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending Approval</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{pendingBills.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Overdue</span>
                <AlertTriangle size={16} className="text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">{overdueBills.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Paid This Month</span>
                <CheckCircle size={16} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{paidThisMonth.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent bills */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Bills</CardTitle>
              <Link href="/bills">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  View all <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {bills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No bills yet</p>
                  <Link href="/bills">
                    <Button variant="outline" size="sm" className="mt-3">Add your first bill</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {bills.slice(0, 6).map((bill: any) => (
                    <Link key={bill.id} href={`/bills/${bill.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{bill.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className="text-sm font-semibold text-foreground">
                            ${parseFloat(bill.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <StatusBadge status={bill.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Upcoming Bills</CardTitle>
              <Calendar size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingBills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No upcoming bills</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBills.slice(0, 6).map((bill: any) => {
                    const daysUntil = bill.due_date
                      ? Math.ceil((new Date(bill.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                    return (
                      <Link key={bill.id} href={`/bills/${bill.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{bill.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {daysUntil !== null
                                ? daysUntil === 0
                                  ? "Due today"
                                  : daysUntil < 0
                                  ? `${Math.abs(daysUntil)}d overdue`
                                  : `In ${daysUntil} day${daysUntil > 1 ? "s" : ""}`
                                : "No date"}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-foreground ml-3">
                            ${parseFloat(bill.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Triage summary */}
        {triage.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500" />
                Risk Triage
              </CardTitle>
              <Link href="/triage">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  Full view <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {triage.slice(0, 4).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.bill?.title || "Unknown bill"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                    </div>
                    <RiskBadge risk={item.risk} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    pending_approval: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700 border-blue-200" },
    paid: { label: "Paid", className: "bg-green-100 text-green-700 border-green-200" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-200" },
    upcoming: { label: "Upcoming", className: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const v = variants[status] || { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${v.className}`}>
      {v.label}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${map[risk] || "bg-gray-100 text-gray-600"}`}>
      {risk}
    </span>
  );
}
