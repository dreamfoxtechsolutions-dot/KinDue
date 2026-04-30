import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { householdApi } from "@/lib/household-api";
import { PrivacyFooter } from "@/components/privacy-footer";
import { useToast } from "@/hooks/use-toast";

// Self-serve "delete my parent's data" flow. Owner-only. Requires the
// caregiver to type the household name verbatim before we'll wipe.
// Everything happens against the active household; account/identity
// removal is a separate Clerk-side flow we link to.
export function SettingsDeleteDataPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<{
    counts: Record<string, number>;
    total: number;
  } | null>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ["household", "me"],
    queryFn: householdApi.me,
  });

  const householdName = me?.household.name ?? "";
  const role = me?.me.role;
  const isOwner = role === "owner";
  const matches =
    confirmText.trim().length > 0 &&
    confirmText.trim() === householdName.trim();

  const purge = useMutation({
    mutationFn: () => householdApi.purgeHouseholdData(confirmText.trim()),
    onSuccess: (data) => {
      setResult({ counts: data.counts, total: data.total });
      qc.invalidateQueries();
      toast({
        title: "Household data erased",
        description: `${data.total.toLocaleString()} record${data.total === 1 ? "" : "s"} removed.`,
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Couldn't complete the deletion.";
      toast({
        title: "Couldn't erase data",
        description: message,
        variant: "destructive",
      });
    },
  });

  if (result) {
    return (
      <Layout>
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-serif text-lg font-medium text-emerald-900">
                  All clear
                </h1>
                <p className="text-sm text-emerald-800/90 mt-1 leading-relaxed">
                  We removed{" "}
                  <strong>{result.total.toLocaleString()}</strong> record
                  {result.total === 1 ? "" : "s"} tied to{" "}
                  <strong>{householdName}</strong>. The household itself and
                  caregiver accounts are still here so you can start fresh.
                </p>
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-serif text-base font-medium mb-3">
              What was removed
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {Object.entries(result.counts)
                .filter(([, n]) => n > 0)
                .map(([k, n]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-b-0"
                  >
                    <dt className="text-muted-foreground capitalize">
                      {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {n.toLocaleString()}
                    </dd>
                  </div>
                ))}
              {result.total === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground">
                  Nothing to remove — your household was already empty.
                </p>
              )}
            </dl>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/")}>Back to home</Button>
            <Button variant="outline" onClick={() => navigate("/settings")}>
              Settings
            </Button>
          </div>

          <PrivacyFooter />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-destructive font-medium">
            Danger zone
          </p>
          <h1 className="font-serif text-2xl font-medium tracking-tight mt-1">
            Erase my parent's data
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            This permanently removes every bill, subscription, document,
            scan log and notification stored for{" "}
            <strong>{householdName || "this household"}</strong>. We'll keep
            the household and caregiver accounts so you can start over if
            you want to.
          </p>
        </div>

        {/* What gets removed */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-serif text-base font-medium">
            What we'll remove
          </h2>
          <ul className="space-y-2 text-sm">
            <Removed>All bills, payment history, and bill comments</Removed>
            <Removed>All recurring subscriptions we've found</Removed>
            <Removed>
              All documents in the vault — including health-related
              uploads like insurance cards, Medicare statements, and
              medical bills (treated with the same care as health records)
            </Removed>
            <Removed>
              Escalation rules, fired alerts, and notification history
            </Removed>
            <Removed>Generated tax/estate reports and Gmail scan logs</Removed>
            <Removed>Pending invitations to other caregivers</Removed>
          </ul>
          <h3 className="font-serif text-sm font-medium pt-2">
            What we'll keep
          </h3>
          <ul className="space-y-2 text-sm">
            <Kept>The household itself, so you can rebuild from scratch</Kept>
            <Kept>
              Caregiver sign-in accounts (close those from your profile)
            </Kept>
            <Kept>
              The audit-log entry recording that this deletion happened
            </Kept>
          </ul>
        </section>

        {/* Confirmation */}
        {!isOwner && !isLoading ? (
          <section className="rounded-lg border border-border bg-muted/40 p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  Only the household owner can do this.
                </p>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  Ask the owner to sign in and run this from their account.
                  This protects against accidental wipes by other caregivers
                  on the household.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="h-5 w-5 text-destructive shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-sm">
                <p className="font-medium text-destructive">
                  This cannot be undone.
                </p>
                <p className="text-foreground/80 mt-1 leading-relaxed">
                  Once you confirm, the data is gone for good — there's no
                  trash can or restore.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border accent-destructive"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                data-testid="ack-checkbox"
              />
              <span className="leading-relaxed">
                I understand this permanently deletes everything Kindue
                has stored for this household and that other caregivers will
                see nothing the next time they sign in.
              </span>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-name" className="text-sm">
                Type{" "}
                <span className="font-mono font-semibold text-destructive">
                  {householdName || "household name"}
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={householdName}
                autoComplete="off"
                spellCheck={false}
                disabled={!acknowledged || isLoading}
                data-testid="confirm-input"
                className="font-mono"
              />
              {confirmText.length > 0 && !matches && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Doesn't match yet
                </p>
              )}
              {matches && (
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Match confirmed
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="destructive"
                disabled={
                  !acknowledged || !matches || purge.isPending || isLoading
                }
                onClick={() => purge.mutate()}
                data-testid="purge-button"
              >
                {purge.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Erasing…
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Erase {householdName || "this household"}'s data
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
                disabled={purge.isPending}
              >
                Cancel
              </Button>
            </div>
          </section>
        )}

        <PrivacyFooter />
      </div>
    </Layout>
  );
}

function Removed({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <XCircle
        className="h-4 w-4 shrink-0 mt-0.5 text-destructive"
        aria-hidden="true"
      />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Kept({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2
        className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700"
        aria-hidden="true"
      />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
