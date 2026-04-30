import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollText, Search, User, Clock } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  bill_created: "bg-blue-100 text-blue-700",
  bill_approved: "bg-green-100 text-green-700",
  bill_rejected: "bg-red-100 text-red-700",
  payment_recorded: "bg-green-100 text-green-700",
  member_invited: "bg-purple-100 text-purple-700",
  member_role_changed: "bg-amber-100 text-amber-700",
  document_uploaded: "bg-teal-100 text-teal-700",
  account_linked: "bg-indigo-100 text-indigo-700",
  triage_run: "bg-orange-100 text-orange-700",
};

export default function AuditLog() {
  const api = useApiClient();
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get("/audit"),
  });

  const filtered = logs.filter((l: any) =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText size={22} />
            Audit Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete history of all household actions
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search actions or users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ScrollText size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">No audit entries yet</p>
              <p className="text-sm text-muted-foreground mt-1">Actions will appear here as your household uses Kindue</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry: any) => {
              const colorClass = ACTION_COLORS[entry.action] || "bg-gray-100 text-gray-700";
              return (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User size={14} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {entry.actor?.name || entry.actor?.email || "Unknown"}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                            {formatLabel(entry.action)}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                        )}
                        {entry.metadata && typeof entry.metadata === "object" && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {JSON.stringify(entry.metadata)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={11} />
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
