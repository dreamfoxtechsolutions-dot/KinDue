import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Shield,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { householdApi } from "@/lib/household-api";
import { HOUSEHOLD_ME_KEY } from "@/hooks/use-household";
import { cn } from "@/lib/utils";

type Choice = "for_someone" | "with_someone" | "just_me";
// "full" is intentionally not selectable yet — bank linking isn't built.
// We keep the type literal for forward-compat but the UI only ever lets the
// user pick "view_only" today.
type StartMode = "view_only" | "full";

const CHOICES: {
  value: Choice;
  label: string;
  hint: string;
  recommended?: boolean;
}[] = [
  {
    value: "for_someone",
    label: "Someone I care for",
    hint: "I'm the caregiver helping a parent or relative stay current.",
    recommended: true,
  },
  {
    value: "with_someone",
    label: "Another family member",
    hint: "Spouse, sibling, partner, or other relative I'm helping.",
  },
  {
    value: "just_me",
    label: "Just myself",
    hint: "I'll keep track of my own bills.",
  },
];

export function OnboardingWizard({
  open,
  defaultName,
  onClose,
}: {
  open: boolean;
  defaultName: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [choice, setChoice] = useState<Choice>("for_someone");
  // Always start blank so the placeholder shows and the user types
  // the actual person's name. We deliberately don't seed any default
  // (e.g. "Mom") — it framed the app around a single relationship.
  const [caregiverFor, setCaregiverFor] = useState("");
  // Locked to view_only today; see StartMode type above.
  const [startMode] = useState<StartMode>("view_only");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const [, setLocation] = useLocation();

  // Clear the name field when the user switches to "just_me" since
  // it's not relevant there. Otherwise leave whatever they typed in.
  useEffect(() => {
    if (choice === "just_me") {
      setCaregiverFor("");
    }
  }, [choice]);

  const persistChoice = useMutation({
    mutationFn: () =>
      householdApi.setOnboarding({
        choice,
        caregiverFor:
          choice === "for_someone" || choice === "with_someone"
            ? caregiverFor.trim() || undefined
            : undefined,
        householdName: defaultName,
      }),
    // Note: we do *not* auto-flip the caregiver's display prefs (font
    // scale, reduced motion) to "senior" just because they picked
    // for_someone. The caregiver isn't the senior — their parent is,
    // and the parent isn't even a user account in this app. The
    // accessibility toggles live on the Settings → Accessibility page
    // for the caregiver to opt in if they personally want them.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
    },
    onError: (e: Error) =>
      toast({
        title: "Could not save",
        description: e.message,
        variant: "destructive",
      }),
  });

  const markWizardSeen = async () => {
    try {
      if (user) {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata ?? {}),
            onboardingWizardSeenAt: new Date().toISOString(),
          },
        });
      }
    } catch {
      // non-fatal
    }
  };

  const handleStep2Continue = async () => {
    try {
      await persistChoice.mutateAsync();
      setStep(3);
    } catch {
      toast({
        title: "Couldn't save your choice",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const finish = async (action: "view_only" | "skip") => {
    if (persistChoice.isSuccess || action === "skip") {
      await markWizardSeen();
    }
    onClose();
    if (action === "skip") {
      return;
    }
    setLocation("/scan");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          void finish("skip");
        }
      }}
    >
      <DialogContent
        className="w-[calc(100%-2rem)] sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {step === 1 && <StepWhy onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepWho
            choice={choice}
            setChoice={setChoice}
            caregiverFor={caregiverFor}
            setCaregiverFor={setCaregiverFor}
            onBack={() => setStep(1)}
            onNext={handleStep2Continue}
            isPending={persistChoice.isPending}
          />
        )}
        {step === 3 && (
          <StepHow
            startMode={startMode}
            onBack={() => setStep(2)}
            onPrimary={() => finish("view_only")}
            onSkip={() => finish("skip")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ active }: { active: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            n <= active ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

function StepWhy({ onNext }: { onNext: () => void }) {
  return (
    <div className="px-6 pt-10 pb-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Shield className="w-7 h-7 text-primary" />
        <span className="text-lg font-bold tracking-tight">Kindue</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
        This account is for your loved one — you'll be their Primary user.
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed">
        Kindue treats the account as theirs. As Primary user you have full
        power to help with their bills, vault, and reminders. You can invite
        Family members and Caregivers later with limited access.
      </p>
      <div className="space-y-3 mt-2">
        {/* Promises kept truthful: every line below corresponds to a
            real product behavior. We deliberately removed the
            previous "free for 30 days" CTA (no paid plan exists) and
            the "Trusted by family caregivers since 2024" line
            (invented social proof). */}
        {[
          "Read-only by default — you stay in control",
          "Encrypted at rest, only visible to your caregiver circle",
          "Delete everything you've added at any time",
        ].map((line) => (
          <div key={line} className="flex gap-3 items-start">
            <CheckCircle2
              className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span className="text-sm text-foreground">{line}</span>
          </div>
        ))}
      </div>
      <Button
        onClick={onNext}
        className="w-full h-14 text-base rounded-2xl font-semibold mt-2"
      >
        Get started
      </Button>
    </div>
  );
}

function StepWho({
  choice,
  setChoice,
  caregiverFor,
  setCaregiverFor,
  onBack,
  onNext,
  isPending,
}: {
  choice: Choice;
  setChoice: (c: Choice) => void;
  caregiverFor: string;
  setCaregiverFor: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  isPending: boolean;
}) {
  const showName = choice !== "just_me";
  return (
    <div className="px-6 pt-8 pb-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <StepDots active={2} />
        <div className="w-6" />
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Who are you helping?
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          We'll set up a private space for them. You can invite siblings later.
        </p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Who you're helping">
        {CHOICES.map((c) => {
          const selected = choice === c.value;
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setChoice(c.value)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 flex items-start justify-between gap-3 transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex-shrink-0 border-2 mt-0.5",
                    selected
                      ? "border-[6px] border-primary"
                      : "border-muted-foreground/40",
                  )}
                  aria-hidden="true"
                />
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      selected ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {c.label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-snug">
                    {c.hint}
                  </span>
                </span>
              </div>
              {c.recommended && (
                <span className="bg-background border border-border px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 self-start">
                  <Star
                    className="w-3 h-3 text-yellow-500 fill-yellow-500"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Recommended
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showName && (
        <div>
          <Label htmlFor="caregiverForName" className="text-sm font-medium">
            Their first name
          </Label>
          <Input
            id="caregiverForName"
            value={caregiverFor}
            onChange={(e) => setCaregiverFor(e.target.value)}
            placeholder="First name or relationship (e.g. Mom, Dad, Aunt Lin)"
            className="mt-2 h-12 text-base rounded-xl px-4"
          />
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={isPending}
        className="w-full h-14 text-base rounded-2xl font-semibold"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
      </Button>
      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
        We'll never contact them without your permission.
      </p>
    </div>
  );
}

function StepHow({
  startMode,
  onBack,
  onPrimary,
  onSkip,
}: {
  startMode: StartMode;
  onBack: () => void;
  onPrimary: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="px-6 pt-8 pb-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <StepDots active={3} />
        <div className="w-6" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Pick how you want to start
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          You can change this anytime. Most caregivers start with view-only.
        </p>
      </div>

      <div className="space-y-3">
        <ModeCard
          selected={startMode === "view_only"}
          onClick={() => {
            /* only view_only is selectable today */
          }}
          emoji="👀"
          title="View only — safest"
          description="We'll watch their email for bills and tell you what we find. We won't connect any bank accounts."
          subtitle="Takes 2 minutes · Connects Gmail (read-only)"
          recommended
        />
        {/* "Full protection" stays visible so caregivers can see it's on
            the roadmap, but it's not selectable yet — Plaid (or any
            bank-linking provider) hasn't been integrated. Letting users
            pick it and then silently routing them to the same Gmail
            scan as view-only was misleading. */}
        <ModeCard
          selected={false}
          disabled
          comingSoon
          onClick={() => {
            /* disabled */
          }}
          emoji="🛡️"
          title="Full protection"
          description="Connect their accounts so we can spot duplicate charges and unusual activity."
          subtitle="Read-only bank link · Coming soon"
        />
      </div>

      <div className="p-3 bg-muted/50 rounded-xl flex items-start gap-2.5 border border-border">
        <Shield
          className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground leading-snug">
          We never move your money. You always approve any action.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Next: invite a Trustee</p>
          <p className="text-xs text-muted-foreground leading-snug">
            Most caregivers add a second Trustee (a sibling or spouse) so
            someone always has full access if you're unavailable. You can
            also add Family members and Caregivers anytime.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={onPrimary}
          className="w-full h-14 text-base rounded-2xl font-semibold"
        >
          Start with view only
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Skip for now — show me around
        </button>
      </div>
    </div>
  );
}

function ModeCard({
  selected,
  onClick,
  emoji,
  title,
  description,
  subtitle,
  recommended,
  disabled,
  comingSoon,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  description: string;
  subtitle: string;
  recommended?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(
        "w-full text-left p-4 rounded-2xl border-2 flex flex-col gap-2 relative transition-colors",
        disabled
          ? "border-border bg-muted/30 cursor-not-allowed opacity-75"
          : selected
            ? "border-primary bg-primary/10"
            : "border-border hover:border-foreground/30",
      )}
    >
      {recommended && !disabled && (
        <div className="absolute top-0 right-3 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
          Recommended
        </div>
      )}
      {comingSoon && (
        <div className="absolute top-0 right-3 -translate-y-1/2 bg-background border border-border text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Coming soon
        </div>
      )}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-5 h-5 rounded-full flex-shrink-0 border-2",
            disabled
              ? "border-muted-foreground/30"
              : selected
                ? "border-[6px] border-primary"
                : "border-muted-foreground/40",
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "text-lg font-bold flex items-center gap-2",
            disabled && "text-muted-foreground",
          )}
        >
          <span className="text-xl" aria-hidden="true">
            {emoji}
          </span>{" "}
          {title}
        </span>
      </div>
      <p
        className={cn(
          "text-sm leading-snug pl-8",
          disabled ? "text-muted-foreground" : "text-foreground/80",
        )}
      >
        {description}
      </p>
      <p className="text-xs font-medium text-muted-foreground pl-8">
        {subtitle}
      </p>
    </button>
  );
}
