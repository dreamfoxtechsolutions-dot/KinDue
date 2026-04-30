// TODO: backend not implemented — every method here will 404 at call time.
// Consumers should expect rejected promises and degrade gracefully.
import { customFetch } from "@workspace/api-client-react";

export type ReportType =
  | "bills_paid"
  | "subscriptions"
  | "activity"
  | "year_end_summary";
export type ReportFormat = "csv" | "pdf";
export type ReportStatus = "pending" | "ready" | "failed";

export type ReportJob = {
  id: number;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  error: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  rowCount: number;
  params: { startDate?: string; endDate?: string };
  requestedBy: string;
  generatedAt: string | null;
  createdAt: string;
};

export type CreateReportInput = {
  type: ReportType;
  format: ReportFormat;
  startDate?: string;
  endDate?: string;
  emailMe?: boolean;
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  bills_paid: "Bills Paid",
  subscriptions: "Subscription History",
  activity: "Activity Log",
  year_end_summary: "Year-End Summary",
};

export const REPORT_TYPE_FORMATS: Record<ReportType, ReportFormat[]> = {
  bills_paid: ["csv", "pdf"],
  subscriptions: ["csv", "pdf"],
  activity: ["csv"],
  year_end_summary: ["pdf"],
};

export type ReportPreview = {
  id: number;
  filename: string;
  mimeType: string;
  byteSize: number;
  rowCount: number;
  type: ReportType;
  format: ReportFormat;
  previewKind: "csv" | "pdf";
  preview: string;
  truncated: boolean;
};

export const reportsApi = {
  list: (): Promise<{ jobs: ReportJob[] }> => customFetch("/api/reports"),
  get: (id: number): Promise<ReportJob> =>
    customFetch(`/api/reports/${id}`),
  preview: (id: number): Promise<ReportPreview> =>
    customFetch(`/api/reports/${id}/preview`),
  create: (input: CreateReportInput): Promise<ReportJob> =>
    customFetch("/api/reports", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  emailMe: (id: number): Promise<{ ok: boolean; reason?: string }> =>
    customFetch(`/api/reports/${id}/email`, { method: "POST" }),
  downloadUrl: (id: number): string => `/api/reports/${id}/download`,
  inlineUrl: (id: number): string => `/api/reports/${id}/download?inline=1`,
};
