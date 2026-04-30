import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  MapPin,
  Phone,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useHouseholdMe, HOUSEHOLD_ME_KEY } from "@/hooks/use-household";
import { householdApi } from "@/lib/household-api";
import { getCurrentPosition } from "@/hooks/use-geo-suggestions";

// First-run guided welcome shown to a brand-new caregiver after the
// household onboarding picker. Absorbs the proxy attestation and the
// wellness check-in setup into a single calm flow so Home doesn't
// greet them with three separate asks at once.
//
// The dialog is fully skippable at every step — anything left undone
// simply falls back to the persistent banner / setup card on Home, so
// users who dismiss it aren't blocked from the app, they just see the
// gentle reminders later.
//
// "Done" / "Skip for now" both stamp `firstRunCompletedAt` on the
// member row so the dialog never reopens for that caregiver — the
// unfinished pieces are nudged from Home from then on.

type Step = "welcome" | "proxy" | "wellness" | "done";

export function FirstRunWelcome() {
  const { data, isLoading } = useHouseholdMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("welcome");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [taggedCoords, setTaggedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [tagging, setTagging] = useState(false);
  // If the finalize call ever fails, we let the user dismiss the
  // dialog locally so they're not trapped behind a non-closable modal.
  // The fallback Home cards (proxy banner / wellness card) treat
  // missing-completion as not-yet-finished, which is the correct
  // recovery: they'll see those reminders and can also retry from
  // there. The dialog re-renders next session for retry.
  const [forceClosed, setForceClosed] = useState(false);

  const me = useMemo(() => {
    if (!data) return null;
    return data.members.find((m) => m.userId === data.me.userId) ?? null;
  }, [data]);

  const acknowledgeProxy = useMutation({
    mutationFn: () => householdApi.acknowledgeProxy(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
      setStep(canManagePresence ? "wellness" : "done");
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Couldn't save right now.";
      toast({ title: "Couldn't save", description: m, variant: "destructive" });
    },
  });

  const savePresence = useMutation({
    mutationFn: () =>
      householdApi.updateCaregiverPresence({
        phone: phone.trim(),
        homeLabel: label.trim(),
        ...(taggedCoords
          ? { homeLat: taggedCoords.lat, homeLng: taggedCoords.lng }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
      setStep("done");
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Couldn't save right now.";
      toast({ title: "Couldn't save", description: m, variant: "destructive" });
    },
  });

  const finish = useMutation({
    mutationFn: () => householdApi.markFirstRunComplete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Couldn't save right now.";
      toast({
        title: "Couldn't finish setup",
        description: `${m} You can close this and try again from Home.`,
        variant: "destructive",
      });
      // Locally close so the user is never trapped behind the modal.
      setForceClosed(true);
    },
  });

  if (isLoading || !data) return null;
  const caregiverFor = data.household.caregiverFor.trim();
  // Only caregivers see the walkthrough — dependents (alerts_only) and
  // households where caregiverFor is blank skip it entirely.
  if (!caregiverFor) return null;
  if (data.me.role === "alerts_only") return null;
  // Already completed for this caregiver.
  if (me?.firstRunCompletedAt) return null;
  // Wait for the household onboarding picker first; it sets onboardingChoice.
  if (data.onboardingNeeded) return null;
  // User dismissed locally after a failed finalize — don't re-open
  // until the next session so they're never trapped.
  if (forceClosed) return null;

  // Wellness setup writes require `manage_members`. Read-only roles
  // (e.g. Family/view_alerts) can't complete that step, so we skip it
  // for them; the proxy step still applies because their actions are
  // logged just like any other caregiver's.
  const canManagePresence = data.me.permissions.includes("manage_members");

  const tagHere = async () => {
    setTagging(true);
    try {
      const here = await getCurrentPosition();
      if (!here) {
        toast({
          title: "Location unavailable",
          description: "Allow location access in your browser to tag this place.",
          variant: "destructive",
        });
        return;
      }
      setTaggedCoords(here);
      toast({
        title: "Location captured",
        description: "Save to remember this as the home address.",
      });
    } finally {
      setTagging(false);
    }
  };

  const skipAll = () => {
    finish.mutate();
  };

  // Picks the right "next" target after a step is dismissed/completed
  // so the user always lands somewhere sensible, even if the proxy is
  // already acknowledged or the user lacks rights to set wellness.
  const nextAfterProxy: Step = canManagePresence ? "wellness" : "done";
  const advanceFromWelcome = () => {
    const proxyDone = !!me?.proxyAcknowledgedAt;
    setStep(proxyDone ? nextAfterProxy : "proxy");
  };

  const completeWalkthrough = () => {
    finish.mutate();
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        // Close attempts (X button, escape) are treated as "skip for now"
        // so the user is never trapped — a fresh dismissal still records
        // completion so the dialog doesn't reappear.
        if (!next) skipAll();
      }}
    >
      <DialogContent className="max-w-md">
        {step === "welcome" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Shield className="h-6 w-6" strokeWidth={2} />
              </div>
              <DialogTitle className="text-center font-serif text-xl">
                Welcome — you're not doing this alone.
              </DialogTitle>
              <DialogDescription className="text-center">
                Kindue is your quiet co-pilot for managing {caregiverFor}'s
                household. Two quick setup steps and you're done — under a
                minute total.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" strokeWidth={2.25} />
                <span>
                  <span className="font-medium">Confirm proxy authority</span>{" "}
                  — a one-tap acknowledgment that's logged so co-caregivers
                  can see who's helping.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 shrink-0 text-primary" strokeWidth={2.25} />
                <span>
                  <span className="font-medium">Set up wellness check-ins</span>{" "}
                  — give us {caregiverFor}'s phone and home so we can gently
                  nudge you when it's been a while.
                </span>
              </li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={skipAll} disabled={finish.isPending}>
                Skip for now
              </Button>
              <Button onClick={advanceFromWelcome}>
                Get started
              </Button>
            </div>
          </>
        )}

        {step === "proxy" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-900">
                <ShieldCheck className="h-6 w-6" strokeWidth={2} />
              </div>
              <DialogTitle className="text-center font-serif text-lg">
                Acting on behalf of {caregiverFor}
              </DialogTitle>
              <DialogDescription className="text-center">
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
                  bills, subscriptions, and accounts.
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
                  My actions are visible to other caregivers via the activity
                  log.
                </span>
              </li>
            </ul>
            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep("wellness")}
                disabled={acknowledgeProxy.isPending}
              >
                Skip
              </Button>
              <Button
                onClick={() => acknowledgeProxy.mutate()}
                disabled={acknowledgeProxy.isPending}
              >
                {acknowledgeProxy.isPending ? "Recording…" : "I confirm"}
              </Button>
            </div>
          </>
        )}

        {step === "wellness" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Phone className="h-6 w-6" strokeWidth={2} />
              </div>
              <DialogTitle className="text-center font-serif text-lg">
                Check-ins for {caregiverFor}
              </DialogTitle>
              <DialogDescription className="text-center">
                We'll only nudge you when it's been a while since you've been
                near them. The location stays inside your household.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="frw-phone">{caregiverFor}'s phone</Label>
                <Input
                  id="frw-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Powers the one-tap "Call {caregiverFor}" button.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="frw-label">Home label</Label>
                <Input
                  id="frw-label"
                  placeholder={`e.g. ${caregiverFor}'s house`}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  Tag {caregiverFor}'s home location
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tap below while you're at their house. We never share your
                  real-time location — only whether you're nearby.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={tagHere}
                    disabled={tagging}
                  >
                    {tagging ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Reading location…
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                        Use current location
                      </>
                    )}
                  </Button>
                  {taggedCoords && (
                    <span className="text-xs text-muted-foreground">
                      Captured (saves on Save)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep("done")}
                disabled={savePresence.isPending}
              >
                Skip
              </Button>
              <Button
                onClick={() => savePresence.mutate()}
                disabled={
                  savePresence.isPending ||
                  (!phone.trim() && !label.trim() && !taggedCoords)
                }
              >
                {savePresence.isPending ? "Saving…" : "Save & continue"}
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
              </div>
              <DialogTitle className="text-center font-serif text-xl">
                You're all set.
              </DialogTitle>
              <DialogDescription className="text-center">
                Kindue is watching {caregiverFor}'s bills with you. You can
                always update these settings from the Settings page.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end">
              <Button onClick={completeWalkthrough} disabled={finish.isPending}>
                {finish.isPending ? "Finishing…" : "Take me home"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
