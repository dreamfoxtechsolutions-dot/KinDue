import { Layout } from "@/components/layout";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  reportsApi,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_FORMATS,
  type ReportFormat,
  type ReportType,
  type ReportJob,
} from "@/lib/reports-api";
import {
  Download,
  Eye,
  Mail,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const REPORTS_KEY = ["reports", "list"] as const;

function formatBytes(b: number): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadge(status: ReportJob["status"]) {
  if (status === "ready")
    return (
      <Badge variant="default" className="bg-green-700 gap-1">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Ready
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Failed
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Generating
    </Badge>
  );
}

export function ReportsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>("bills_paid");
  const allowedFormats = REPORT_TYPE_FORMATS[type];
  const [format, setFormat] = useState<ReportFormat>(allowedFormats[0]);
  const thisYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState<string>(`${thisYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [emailMe, setEmailMe] = useState(false);

  const list = useQuery({
    queryKey: REPORTS_KEY,
    queryFn: () => reportsApi.list(),
    refetchInterval: (q) => {
      const data = q.state.data as { jobs: ReportJob[] } | undefined;
      const anyPending = data?.jobs.some((j) => j.status === "pending");
      return anyPending ? 1500 : false;
    },
  });

  const create = useMutation({
    mutationFn: () =>
      reportsApi.create({ type, format, startDate, endDate, emailMe }),
    onSuccess: () => {
      toast({ title: "Generating report…", description: "It'll appear below when ready." });
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
    },
    onError: (e: Error) =>
      toast({ title: "Could not start report", description: e.message, variant: "destructive" }),
  });

  const sendEmail = useMutation({
    mutationFn: (id: number) => reportsApi.emailMe(id),
    onSuccess: (r) => {
      if (r.ok) toast({ title: "Email sent" });
      else
        toast({
          title: "Email failed",
          description: r.reason ?? "Try again later.",
          variant: "destructive",
        });
    },
    onError: (e: Error) =>
      toast({ title: "Email failed", description: e.message, variant: "destructive" }),
  });

  const onTypeChange = (next: ReportType) => {
    setType(next);
    const formats = REPORT_TYPE_FORMATS[next];
    if (!formats.includes(format)) setFormat(formats[0]);
  };

  const showDateRange = type !== "subscriptions";
  const isYearEnd = type === "year_end_summary";

  const jobs = useMemo(() => list.data?.jobs ?? [], [list.data]);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const previewQuery = useQuery({
    queryKey: ["reports", "preview", previewId],
    queryFn: () => reportsApi.preview(previewId!),
    enabled: previewId !== null,
  });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="border-b border-border pb-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Records & exports
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-medium tracking-tight">
            Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate exports for accountants, elder-law attorneys, or family.
            Reports are scoped to your active household.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate a report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-type">Report</Label>
                <Select value={type} onValueChange={(v) => onTypeChange(v as ReportType)}>
                  <SelectTrigger id="report-type" data-testid="select-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {REPORT_TYPE_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-format">Format</Label>
                <Select
                  value={format}
                  onValueChange={(v) => setFormat(v as ReportFormat)}
                >
                  <SelectTrigger id="report-format" data-testid="select-report-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedFormats.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showDateRange && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="report-start">
                    {isYearEnd ? "Year start" : "Start date"}
                  </Label>
                  <Input
                    id="report-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="report-end">
                    {isYearEnd ? "Year end (informational)" : "End date"}
                  </Label>
                  <Input
                    id="report-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={emailMe}
                onCheckedChange={(v) => setEmailMe(v === true)}
              />
              Email me when ready
            </label>

            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="gap-2"
              data-testid="button-generate-report"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent reports</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => list.refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {jobs.map((j) => (
                  <div
                    key={j.id}
                    className="py-3 flex flex-wrap items-center gap-3"
                    data-testid={`report-row-${j.id}`}
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-medium text-sm">
                        {REPORT_TYPE_LABELS[j.type]} ·{" "}
                        <span className="uppercase text-xs text-muted-foreground">
                          {j.format}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(j.createdAt).toLocaleString()} · {j.requestedBy}
                        {j.byteSize > 0 && ` · ${formatBytes(j.byteSize)}`}
                        {j.rowCount > 0 && ` · ${j.rowCount} rows`}
                      </div>
                      {j.status === "failed" && j.error && (
                        <div className="text-xs text-destructive mt-1">{j.error}</div>
                      )}
                    </div>
                    {statusBadge(j.status)}
                    {j.status === "ready" && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            setPreviewId((cur) => (cur === j.id ? null : j.id))
                          }
                          data-testid={`button-preview-${j.id}`}
                        >
                          <Eye className="h-3 w-3" />
                          {previewId === j.id ? "Hide preview" : "Preview"}
                        </Button>
                        <a
                          href={reportsApi.downloadUrl(j.id)}
                          download={j.filename}
                        >
                          <Button variant="outline" size="sm" className="gap-1">
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          disabled={sendEmail.isPending}
                          onClick={() => sendEmail.mutate(j.id)}
                        >
                          <Mail className="h-3 w-3" /> Email me
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {previewId !== null && (
          <Card data-testid="report-preview-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Preview {previewQuery.data ? `· ${previewQuery.data.filename}` : ""}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => setPreviewId(null)}
              >
                <X className="h-3 w-3" /> Close
              </Button>
            </CardHeader>
            <CardContent>
              {previewQuery.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
                </div>
              )}
              {previewQuery.isError && (
                <p className="text-sm text-destructive">
                  Could not load the preview.
                </p>
              )}
              {previewQuery.data && previewQuery.data.previewKind === "csv" && (
                <>
                  <pre className="text-xs bg-muted/40 border border-border rounded p-3 overflow-auto max-h-[420px] whitespace-pre">
                    {previewQuery.data.preview || "(empty)"}
                  </pre>
                  {previewQuery.data.truncated && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing the first 30 lines · {previewQuery.data.rowCount} total rows.
                    </p>
                  )}
                </>
              )}
              {previewQuery.data && previewQuery.data.previewKind === "pdf" && (
                <iframe
                  title="Report preview"
                  src={reportsApi.inlineUrl(previewQuery.data.id)}
                  className="w-full h-[600px] border border-border rounded bg-white"
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
