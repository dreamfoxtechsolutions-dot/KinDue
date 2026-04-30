import { useState } from "react";
import { ShieldCheck, UserCheck, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useHouseholdMe, HOUSEHOLD_ME_KEY } from "@/hooks/use-household";
import { householdApi } from "@/lib/household-api";

const SESSION_DISMISS_KEY = "billguard.proxyBanner.dismissed";

function dismissedThisSession(householdId: number) {
  try {
    return sessionStorage.getItem(`${SESSION_DISMISS_KEY}.${householdId}`) === "1";
  } catch {
    return false;
  }
}

function markDismissedThisSession(householdId: number) {
  try {
    sessionStorage.setItem(`${SESSION_DISMISS_KEY}.${householdId}`, "1");
  } catch {
    // sessionStorage can be disabled — failing closed (banner stays) is fine.
  }
}

// Persistent reminder of which household + dependent the caregiver is
// currently operating on behalf of. The first time a caregiver enters
// proxy mode for a given household, they're asked to formally attest
// authority — that attestation is recorded to the audit log so siblings
// can see who took on proxy responsibility and when.
export function ProxyBanner() {
  const { data, isLoading } = useHouseholdMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [attestOpen, setAttestOpen] = useState(false);
  const [, setRerender] = useState(0);

  const acknowledge = useMutation({
    mutationFn: () => householdApi.acknowledgeProxy(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
      setAttestOpen(false);
      toast({
        title: "Proxy authority recorded",
        description:
          "Your siblings will see this attestation in the activity log.",
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Could not save attestation.";
      toast({ title: "Couldn't save", description: message, variant: "destructive" });
    },
  });

  if (isLoading || !data) return null;
  const caregiverFor = data.household.caregiverFor.trim();
  if (!caregiverFor) return null;
  // Task #59 retired the dedicated dependent tier; legacy alerts_only
  // members now behave as Caregivers and should see the proxy banner.

  // The first-run welcome dialog already walks new caregivers through
  // the proxy attestation. Suppress the banner until that walkthrough
  // is dismissed/completed so the user isn't asked twice.
  const meRow = data.members.find((m) => m.userId === data.me.userId);
  if (!meRow?.firstRunCompletedAt) return null;

  const acknowledged = !!meRow?.proxyAcknowledgedAt;

  // First-run formal attestation card — full-width, can't be dismissed
  // until the caregiver confirms (or scrolls past — it's not a modal,
  // just a prominent block).
  if (!acknowledged) {
    return (
      <>
        {/* Cool slate/sky palette so this trust/identity banner reads as
            "context about who you are right now", visually distinct from
            the warm amber wellness nudge ("act on this now"). When both
            fire on the same screen, color now does the work of telling
            them apart at a glance. */}
        <div className="border-b border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100">
          <div className="mx-auto flex max-w-3xl items-start gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                You are about to manage {caregiverFor}'s accounts as their proxy.
              </p>
              <p className="mt-0.5 text-sky-900/85 dark:text-sky-100/80">
                Please confirm you're authorized to act on {caregiverFor}'s behalf.
                This is logged so your co-caregivers can see who took on proxy
                responsibility.
              </p>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setAttestOpen(true)}
                  className="bg-sky-900 text-sky-50 hover:bg-sky-900/90 dark:bg-sky-100 dark:text-sky-950 dark:hover:bg-sky-100/90"
                >
                  Review &amp; confirm
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={attestOpen} onOpenChange={setAttestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Acting on behalf of {caregiverFor}</DialogTitle>
              <DialogDescription>
                Kindue records this attestation in your household's activity
                log. It does not create or replace any legal power-of-attorney
                document.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-sm text-foreground/85">
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>
                  I am authorized to act on {caregiverFor}'s behalf in managing
                  these bills, subscriptions, and accounts.
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>
                  I will manage {caregiverFor}'s affairs in their interest, not
                  my own.
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>
                  My actions are visible to other caregivers in this household
                  via the activity log.
                </span>
              </li>
            </ul>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAttestOpen(false)}
                disabled={acknowledge.isPending}
              >
                Not now
              </Button>
              <Button
                type="button"
                onClick={() => acknowledge.mutate()}
                disabled={acknowledge.isPending}
              >
                {acknowledge.isPending ? "Recording…" : "I confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Compact persistent strip once attestation is on file. Dismissible
  // for visual quietness for the rest of the session — comes back next
  // login so it can never silently disappear forever.
  if (dismissedThisSession(data.household.id)) return null;

  return (
    <div className="border-b border-border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <UserCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span className="flex-1 min-w-0 truncate">
          Acting on behalf of <span className="font-medium text-foreground">{caregiverFor}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            markDismissedThisSession(data.household.id);
            setRerender((n) => n + 1);
          }}
          aria-label="Hide proxy reminder for this session"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-foreground/5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
