import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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

// Email-capture modal used by the Pricing page for the two paid
// tiers we haven't shipped billing for yet (Family Plus, Trusted
// Circle). Posts directly to the public /api/waitlist endpoint —
// no auth, no Clerk, no react-query — because this surface is
// reached from signed-out marketing pages.

export type WaitlistTier = "plus" | "trusted_circle";

const TIER_COPY: Record<
  WaitlistTier,
  { title: string; description: string; success: string }
> = {
  plus: {
    title: "Get notified when Family Plus opens",
    description:
      "We'll only email you once when paid plans go live. No marketing list, no follow-ups.",
    success:
      "You're on the list. We'll email you the moment Family Plus is ready.",
  },
  trusted_circle: {
    title: "Join the Trusted Circle waitlist",
    description:
      "Trusted Circle adds an advisor seat and extended monitoring. We'll email you when it opens for early access.",
    success:
      "You're on the Trusted Circle waitlist. We'll be in touch as soon as we open early access.",
  },
};

export function WaitlistModal({
  tier,
  open,
  onOpenChange,
}: {
  tier: WaitlistTier;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const copy = TIER_COPY[tier];

  function reset() {
    setEmail("");
    setState("idle");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          tier,
          source: "marketing-pricing",
        }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many tries. Please wait a minute and try again.");
        } else if (res.status === 400) {
          setError("That doesn't look like a valid email address.");
        } else {
          setError("Couldn't save right now. Please try again in a minute.");
        }
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("Couldn't reach the server. Check your connection and retry.");
      setState("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          // Defer reset so the success state stays visible during the
          // close animation rather than flashing back to the form.
          setTimeout(reset, 250);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {state === "done" ? "Thanks — you're on the list." : copy.title}
          </DialogTitle>
          <DialogDescription>
            {state === "done" ? copy.success : copy.description}
          </DialogDescription>
        </DialogHeader>

        {state === "done" ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            <span>{email}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="waitlist-email">Email</Label>
              <Input
                id="waitlist-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={state === "submitting"}
                data-testid="input-waitlist-email"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="text-xs text-destructive"
                data-testid="text-waitlist-error"
              >
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={state === "submitting"}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={state === "submitting" || email.trim().length < 3}
                data-testid="button-waitlist-submit"
              >
                {state === "submitting" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Notify me"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
