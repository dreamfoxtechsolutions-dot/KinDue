import { useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone, CheckCircle2, BellOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

const STALE_VISIT_DAYS = 14;

function isMissingHomeContext(home: {
  caregiverHomeLat: number | null;
  caregiverHomeLng: number | null;
  caregiverPhone: string;
}): boolean {
  return (
    typeof home.caregiverHomeLat !== "number" &&
    typeof home.caregiverHomeLng !== "number" &&
    !home.caregiverPhone.trim()
  );
}

// Surfaces the same geo-derived "last visited" data we already use for
// stale subscriptions, but for the parent / dependent themselves. Shows
// when caregiver hasn't physically been near the dependent's home in
// STALE_VISIT_DAYS, with one-tap "Call" + manual "I just visited"
// affordances. Designed for the simple-home page so it lives next to
// the daily bills.
export function WellnessCheckinCard() {
  const { data, isLoading } = useHouseholdMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [setupOpen, setSetupOpen] = useState(false);

  const checkin = useMutation({
    mutationFn: (kind: "visited" | "snoozed") =>
      householdApi.recordWellnessCheckin(
        kind === "snoozed" ? { kind, snoozeDays: 7 } : { kind },
      ),
    onSuccess: (_res, kind) => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
      toast({
        title: kind === "visited" ? "Visit logged" : "Snoozed for 7 days",
        description:
          kind === "visited"
            ? "We'll quiet this reminder for a while."
            : "We'll check back next week.",
      });
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Try again in a moment.";
      toast({ title: "Couldn't save", description: m, variant: "destructive" });
    },
  });

  if (isLoading || !data) return null;
  const caregiverFor = data.household.caregiverFor.trim();
  if (!caregiverFor) return null;
  if (data.me.role === "alerts_only") return null;

  const me = data.members.find((m) => m.userId === data.me.userId);
  // The first-run walkthrough handles initial wellness setup. Suppress
  // this card until the welcome dialog is finished/skipped so we don't
  // ask the same thing twice on the user's very first visit.
  if (!me?.firstRunCompletedAt) return null;
  // Caregiver phone + home location are sensitive and only visible to
  // Trustees. Hide the wellness card entirely for non-Trustee viewers
  // rather than showing an empty/setup CTA they can't act on.
  if (
    Array.isArray(data.household.redactedFields) &&
    data.household.redactedFields.includes("caregiverPhone")
  ) {
    return null;
  }
  const lastVisit = me?.lastVisitedCaregiverAt
    ? parseISO(me.lastVisitedCaregiverAt)
    : null;
  const snoozedUntil = me?.visitSnoozedUntil
    ? parseISO(me.visitSnoozedUntil)
    : null;
  if (snoozedUntil && snoozedUntil.getTime() > Date.now()) return null;

  const homeLatKnown = typeof data.household.caregiverHomeLat === "number";
  const phoneKnown = data.household.caregiverPhone.trim().length > 0;

  // Setup state: nothing on file yet — invite the user to add a phone
  // number and tag the home location so the card can become useful.
  if (isMissingHomeContext(data.household)) {
    return (
      <>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Get reminded to check in on {caregiverFor}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add {caregiverFor}'s phone and home address so Kindue can
                gently nudge you when it's been a while since you visited.
              </p>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>
                  Set up check-ins
                </Button>
              </div>
            </div>
          </div>
        </div>
        <PresenceSetupDialog
          open={setupOpen}
          onOpenChange={setSetupOpen}
          caregiverFor={caregiverFor}
          initialPhone={data.household.caregiverPhone}
          initialLabel={data.household.caregiverHomeLabel}
        />
      </>
    );
  }

  const daysSince = lastVisit
    ? differenceInCalendarDays(new Date(), lastVisit)
    : null;
  const stale =
    homeLatKnown &&
    (daysSince === null || daysSince >= STALE_VISIT_DAYS);

  // Home location is set but user hasn't been near it long enough to
  // trigger a nudge — keep the surface quiet. We could show a tiny "last
  // visited 4 days ago" line, but that would compete with the bills hero.
  if (!stale) return null;

  const headline =
    daysSince === null
      ? `It's been a while since you visited ${caregiverFor}.`
      : `It's been ${daysSince} day${daysSince === 1 ? "" : "s"} since you visited ${caregiverFor}.`;

  return (
    <>
      <div
        role="region"
        aria-label={`Wellness check-in for ${caregiverFor}`}
        className="rounded-lg border border-amber-200 bg-amber-50/70 p-4"
      >
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 mt-0.5 shrink-0 text-amber-900" strokeWidth={2} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-950">{headline}</p>
            <p className="mt-0.5 text-xs text-amber-900/80">
              A quick call can mean a lot. Want to reach out?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {phoneKnown ? (
                <Button
                  asChild
                  size="sm"
                  className="bg-amber-900 text-amber-50 hover:bg-amber-900/90"
                >
                  <a href={`tel:${data.household.caregiverPhone}`}>
                    <Phone className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                    Call {caregiverFor}
                  </a>
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>
                  Add phone number
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => checkin.mutate("visited")}
                disabled={checkin.isPending}
              >
                {checkin.isPending && checkin.variables === "visited" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                )}
                I just visited
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => checkin.mutate("snoozed")}
                disabled={checkin.isPending}
              >
                <BellOff className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                Snooze a week
              </Button>
            </div>
          </div>
        </div>
      </div>
      <PresenceSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        caregiverFor={caregiverFor}
        initialPhone={data.household.caregiverPhone}
        initialLabel={data.household.caregiverHomeLabel}
      />
    </>
  );
}

function PresenceSetupDialog({
  open,
  onOpenChange,
  caregiverFor,
  initialPhone,
  initialLabel,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  caregiverFor: string;
  initialPhone: string;
  initialLabel: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [phone, setPhone] = useState(initialPhone);
  const [label, setLabel] = useState(initialLabel);
  const [tagging, setTagging] = useState(false);
  const [taggedCoords, setTaggedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const save = useMutation({
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
      onOpenChange(false);
      toast({
        title: "Saved",
        description: `Kindue will check in on ${caregiverFor} for you.`,
      });
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Couldn't save right now.";
      toast({ title: "Save failed", description: m, variant: "destructive" });
    },
  });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-ins for {caregiverFor}</DialogTitle>
          <DialogDescription>
            We'll only nudge you when it's been a while since you've been near
            them. The location is saved to your household, never shared.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="caregiverPhone">{caregiverFor}'s phone</Label>
            <Input
              id="caregiverPhone"
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
            <Label htmlFor="homeLabel">Home label</Label>
            <Input
              id="homeLabel"
              placeholder={`e.g. ${caregiverFor}'s house`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Tag {caregiverFor}'s home location</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap below while you're at their house. We never share your real-time
              location — only whether you're nearby.
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
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
