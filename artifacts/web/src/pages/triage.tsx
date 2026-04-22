import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, FileText, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Triage() {
  const api = useApiClient();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: triageItems = [], isLoading, refetch } = useQuery({
    queryKey: ["triage"],
    queryFn: () => api.get("/triage"),
  });

  const runTriage = useMutation({
    mutationFn: () => api.post("/triage/run"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["triage"] });
      toast({ title: "Triage complete", description: "Risk assessments have been updated." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const highRisk = triageItems.filter((t: any) => t.risk === "high");
  const mediumRisk = triageItems.filter((t: any) => t.risk === "medium");
  const lowRisk = triageItems.filter((t: any) => t.risk === "low");

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp size={22} className="text-amber-500" />
              Risk Triage
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered risk assessment of your household bills
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => runTriage.mutate()}
            disabled={runTriage.isPending}
          >
            <RefreshCw size={15} className={runTriage.isPending ? "animate-spin" : ""} />
            {runTriage.isPending ? "Running..." : "Run Triage"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{highRisk.length}</p>
              <p className="text-xs font-medium text-red-500 mt-1">High Risk</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{mediumRisk.length}</p>
              <p className="text-xs font-medium text-amber-500 mt-1">Medium Risk</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{lowRisk.length}</p>
              <p className="text-xs font-medium text-green-500 mt-1">Low Risk</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading triage data...</div>
        ) : triageItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No triage data yet</p>
              <p className="text-sm text-muted-foreground mt-1">Run triage to assess bill risks</p>
              <Button className="mt-4" onClick={() => runTriage.mutate()} disabled={runTriage.isPending}>
                Run First Triage
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {([
              { label: "High Risk", items: highRisk, color: "red" },
              { label: "Medium Risk", items: mediumRisk, color: "amber" },
              { label: "Low Risk", items: lowRisk, color: "green" },
            ] as const).map(({ label, items, color }) =>
              items.length > 0 && (
                <div key={label}>
                  <h2 className={`text-sm font-semibold mb-2 text-${color}-600`}>{label}</h2>
                  <div className="space-y-2">
                    {items.map((item: any) => (
                      <Link key={item.id} href={`/bills/${item.bill_id}`}>
                        <Card className="cursor-pointer hover:shadow-sm transition-all group">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                color === "red" ? "bg-red-500" : color === "amber" ? "bg-amber-500" : "bg-green-500"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {item.bill?.title || "Unknown bill"}
                                </p>
                                {item.reason && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.reason}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.score !== undefined && (
                                  <span className="text-xs text-muted-foreground">Score: {item.score}</span>
                                )}
                                <ChevronRight size={15} className="text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
