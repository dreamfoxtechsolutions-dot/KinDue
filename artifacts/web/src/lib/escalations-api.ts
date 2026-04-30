// TODO: backend not implemented — every method here will 404 at call time.
// Consumers should expect rejected promises and degrade gracefully.
import { customFetch } from "@workspace/api-client-react";

export type EscalationRule = {
  id: number;
  householdId: number;
  name: string;
  isEnabled: number;
  triggerType: "due_in_days" | "overdue";
  leadTimeDays: number;
  minCriticality: "normal" | "high" | "critical";
  recipientRole: "owner" | "full" | "all";
  createdAt: string;
};

export type EscalationCandidate = {
  ruleId: number;
  ruleName: string;
  triggerType: string;
  triggerKey: string;
  billId: number;
  billName: string;
  billDueDate: string;
  criticality: string;
  reason: string;
  recipients: Array<{ userId: string; name: string; email: string }>;
};

export type EscalationEvent = {
  id: number;
  ruleId: number;
  billId: number;
  triggerKey: string;
  recipientCount: number;
  deliveredCount: number;
  firedAt: string;
};

export type CreateRulePayload = Omit<
  EscalationRule,
  "id" | "householdId" | "createdAt" | "isEnabled"
> & { isEnabled?: boolean; name?: string };

export const escalationsApi = {
  list: (): Promise<{ rules: EscalationRule[] }> =>
    customFetch("/api/household/me/escalation-rules"),
  create: (rule: CreateRulePayload): Promise<{ rule: EscalationRule }> =>
    customFetch("/api/household/me/escalation-rules", {
      method: "POST",
      body: JSON.stringify(rule),
    }),
  update: (
    id: number,
    patch: Partial<CreateRulePayload>,
  ): Promise<{ rule: EscalationRule }> =>
    customFetch(`/api/household/me/escalation-rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  remove: (id: number): Promise<{ ok: true }> =>
    customFetch(`/api/household/me/escalation-rules/${id}`, {
      method: "DELETE",
    }),
  preview: (): Promise<{ candidates: EscalationCandidate[] }> =>
    customFetch("/api/household/me/escalation-rules/preview"),
  events: (): Promise<{ events: EscalationEvent[] }> =>
    customFetch("/api/household/me/escalation-events"),
};
