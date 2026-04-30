import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  escalationsApi,
  type CreateRulePayload,
  type EscalationRule,
} from "@/lib/escalations-api";
import { ArrowLeft, AlertTriangle, Plus, Trash2 } from "lucide-react";

const DEFAULT_RULE: CreateRulePayload = {
  name: "",
  triggerType: "due_in_days",
  leadTimeDays: 3,
  minCriticality: "critical",
  recipientRole: "full",
  isEnabled: true,
};

export function EscalationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<CreateRulePayload>(DEFAULT_RULE);

  const rules = useQuery({
    queryKey: ["escalation-rules"],
    queryFn: () => escalationsApi.list(),
  });
  const preview = useQuery({
    queryKey: ["escalation-rules-preview"],
    queryFn: () => escalationsApi.preview(),
  });
  const events = useQuery({
    queryKey: ["escalation-events"],
    queryFn: () => escalationsApi.events(),
  });

  const create = useMutation({
    mutationFn: (rule: CreateRulePayload) => escalationsApi.create(rule),
    onSuccess: () => {
      setDraft(DEFAULT_RULE);
      qc.invalidateQueries({ queryKey: ["escalation-rules"] });
      qc.invalidateQueries({ queryKey: ["escalation-rules-preview"] });
      toast({ title: "Rule added" });
    },
    onError: (err) => toast({ title: "Failed to add rule", description: String(err), variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CreateRulePayload> }) =>
      escalationsApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escalation-rules"] });
      qc.invalidateQueries({ queryKey: ["escalation-rules-preview"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => escalationsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escalation-rules"] });
      qc.invalidateQueries({ queryKey: ["escalation-rules-preview"] });
      toast({ title: "Rule deleted" });
    },
  });

  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <Link href="/household">
        <Button variant="ghost" size="sm" className="-ml-2 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to household
        </Button>
      </Link>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-semibold">Escalation rules</h1>
          <p className="text-sm text-muted-foreground">
            Automatically alert your backup caregivers when critical bills slip.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Add a rule</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Rule name (optional)"
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase text-muted-foreground">Trigger</label>
              <Select
                value={draft.triggerType}
                onValueChange={(v) =>
                  setDraft({ ...draft, triggerType: v as CreateRulePayload["triggerType"] })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_in_days">Due within N days</SelectItem>
                  <SelectItem value="overdue">Already overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Lead time (days)</label>
              <Input
                type="number"
                min={0}
                max={60}
                value={draft.leadTimeDays}
                disabled={draft.triggerType === "overdue"}
                onChange={(e) => setDraft({ ...draft, leadTimeDays: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Minimum criticality</label>
              <Select
                value={draft.minCriticality}
                onValueChange={(v) =>
                  setDraft({ ...draft, minCriticality: v as CreateRulePayload["minCriticality"] })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High and above</SelectItem>
                  <SelectItem value="normal">Normal and above</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Notify</label>
              <Select
                value={draft.recipientRole}
                onValueChange={(v) =>
                  setDraft({ ...draft, recipientRole: v as CreateRulePayload["recipientRole"] })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Backup caregivers</SelectItem>
                  <SelectItem value="owner">Primary caregivers</SelectItem>
                  <SelectItem value="all">Everyone in household</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => create.mutate(draft)} disabled={create.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> Add rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active rules</CardTitle></CardHeader>
        <CardContent>
          {rules.data?.rules.length ? (
            <div className="space-y-3">
              {rules.data.rules.map((r) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  onToggle={(enabled) => update.mutate({ id: r.id, patch: { isEnabled: enabled } })}
                  onDelete={() => remove.mutate(r.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No rules yet. Add one above to get started.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What would escalate today?</CardTitle>
        </CardHeader>
        <CardContent>
          {preview.data?.candidates.length ? (
            <ul className="space-y-2 text-sm">
              {preview.data.candidates.map((c, i) => (
                <li key={i} className="rounded border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.criticality}</Badge>
                    <span className="font-medium">{c.billName}</span>
                  </div>
                  <p className="text-muted-foreground mt-1">{c.reason}</p>
                  <p className="text-xs mt-1">
                    Would notify: {c.recipients.map((r) => r.name || r.email).join(", ") || "no eligible recipients"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing matches your rules right now.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent escalations</CardTitle></CardHeader>
        <CardContent>
          {events.data?.events.length ? (
            <ul className="space-y-2 text-sm">
              {events.data.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between border-b py-2">
                  <span>Bill #{e.billId} ({e.triggerKey})</span>
                  <span className="text-muted-foreground">
                    {e.deliveredCount}/{e.recipientCount} delivered · {new Date(e.firedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No escalations have fired yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: EscalationRule;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const desc =
    rule.triggerType === "overdue"
      ? `When a ${rule.minCriticality}+ bill goes overdue`
      : `When a ${rule.minCriticality}+ bill is due within ${rule.leadTimeDays} day${rule.leadTimeDays === 1 ? "" : "s"}`;
  const target =
    rule.recipientRole === "all"
      ? "everyone"
      : rule.recipientRole === "owner"
      ? "primary caregivers"
      : "backup caregivers";
  return (
    <div className="flex items-start justify-between rounded border p-3 gap-3">
      <div className="flex-1">
        <p className="font-medium">{rule.name || desc}</p>
        <p className="text-xs text-muted-foreground">{desc} · notify {target}</p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={rule.isEnabled === 1} onCheckedChange={onToggle} />
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
