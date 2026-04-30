import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  Star,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { householdApi, type HouseholdRole } from "@/lib/household-api";
import { HOUSEHOLD_ME_KEY } from "@/hooks/use-household";
import { cn } from "@/lib/utils";

type StartMode = "view_only" | "full";

// The four roles available in Kindue, presented as onboarding choices.
// Descriptions are written for someone who has not yet joined a household
// — they explain what the role will let them do, not what they are.
const ROLE_OPTIONS: {
  role: HouseholdRole;
  label: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  recommended?: boolean;
  requiresVerification?: boolean;
}[] = [
  {
    role: "primary_user",
    label: "Primary User",
    icon: UserCog,
    tagline: "Full account ownership",
    description:
      "You own the household account and have complete control over bills, documents, members, and settings. All other roles report up to you. Choose this if you're setting up the account for yourself or a loved one you're solely responsible for.",
    recommended: true,
  },
  {
    role: "trustee",
    label: "Trustee",
    icon: ShieldCheck,
    tagline: "Elevated shared access",
    description:
      "You share full management access alongside the Primary User — you can approve bills, manage members, and view sensitive documents. Because Trustees can access protected health-adjacent financial records, this role requires HIPAA identity verification before it becomes active.",
    requiresVerification: true,
  },
  {
    role: "caregiver",
    label: "Caregiver",
    icon: Users,
    tagline: "Day-to-day assistance",
    description:
      "You can view bills, mark them paid, add notes, and scan email for new bills. You cannot manage household members, access legal/medical documents, or change account settings. Best for a professional caregiver or a family member with a helping role.",
  },
  {
    role: "other",
    label: "Other",
    icon: Eye,
    tagline: "View-only access",
    description:
      "You can see what's happening in the household — bills, status, recent activity — but cannot take actions or access sensitive records. Good for a family member who wants to stay informed without being responsible.",
  },
];

// Steps: 1 = why, 2 = role select, 3 = verify (trustee only) | how (others)
type Step = 1 | 2 | 3;

export function OnboardingWizard({
  open,
  defaultName,
  onClose,
}: {
  open: boolean;
  defaultName: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [selectedRole, setSelectedRole] = useState<HouseholdRole>("primary_user");
  const [startMode] = useState<StartMode>("view_only");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const [, setLocation] = useLocation();

  const persistChoice = useMutation({
    mutationFn: () =>
      householdApi.setOnboarding({
        choice:
          selectedRole === "primary_user"
            ? "just_me"
            : selectedRole === "caregiver"
              ? "for_someone"
              : "with_someone",
        caregiverFor: undefined,
        householdName: defaultName,
      }),
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

  const markWizardSeen = async (extra?: Record<string, unknown>) => {
    try {
      if (user) {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata ?? {}),
            onboardingWizardSeenAt: new Date().toISOString(),
            onboardingRole: selectedRole,
            ...extra,
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

  const handleVerificationSubmit = async () => {
    await markWizardSeen({
      trusteeVerificationStatus: "pending_hipaa",
      trusteeVerificationRequestedAt: new Date().toISOString(),
    });
    onClose();
  };

  const finish = async (action: "view_only" | "skip") => {
    if (persistChoice.isSuccess || action === "skip") {
      await markWizardSeen();
    }
    onClose();
    if (action === "skip") return;
    setLocation("/scan");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void finish("skip");
      }}
    >
      <DialogContent
        className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {step === 1 && <StepWhy onNext={() => setStep(2)} />}

        {step === 2 && (
          <StepWho
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            onBack={() => setStep(1)}
            onNext={handleStep2Continue}
            isPending={persistChoice.isPending}
          />
        )}

        {step === 3 && selectedRole === "trustee" && (
          <StepVerify
            onBack={() => setStep(2)}
            onSubmit={handleVerificationSubmit}
            onChooseDifferent={() => setStep(2)}
          />
        )}

        {step === 3 && selectedRole !== "trustee" && (
          <StepHow
            startMode={startMode}
            selectedRole={selectedRole}
            onBack={() => setStep(2)}
            onPrimary={() => finish("view_only")}
            onSkip={() => finish("skip")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ active, total = 3 }: { active: number; total?: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
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
        Welcome — let's set up your household.
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed">
        Kindue organises bills and financial records for a household, then lets you share
        access with family members and caregivers — each with the right level of
        visibility.
      </p>
      <div className="space-y-3 mt-2">
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
  selectedRole,
  setSelectedRole,
  onBack,
  onNext,
  isPending,
}: {
  selectedRole: HouseholdRole;
  setSelectedRole: (r: HouseholdRole) => void;
  onBack: () => void;
  onNext: () => void;
  isPending: boolean;
}) {
  const selected = ROLE_OPTIONS.find((o) => o.role === selectedRole)!;

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
          What is your role?
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          Choose the role that describes how you'll use this household account.
        </p>
      </div>

      <div className="space-y-2.5" role="radiogroup" aria-label="Your role">
        {ROLE_OPTIONS.map((opt) => {
          const isSelected = selectedRole === opt.role;
          const Icon = opt.icon;
          return (
            <button
              key={opt.role}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedRole(opt.role)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 flex items-center gap-4 transition-colors",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-primary/20" : "bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isSelected ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      isSelected ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {opt.label}
                  </span>
                  {opt.recommended && (
                    <span className="bg-background border border-border px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <Star
                        className="w-3 h-3 text-yellow-500 fill-yellow-500"
                        aria-hidden="true"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Recommended
                      </span>
                    </span>
                  )}
                  {opt.requiresVerification && (
                    <span className="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        HIPAA Verified
                      </span>
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{opt.tagline}</span>
              </div>
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex-shrink-0 border-2",
                  isSelected
                    ? "border-[6px] border-primary"
                    : "border-muted-foreground/40",
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* Expanded description for the selected role */}
      {selected && (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm leading-relaxed transition-colors",
            selected.requiresVerification
              ? "border-amber-200 bg-amber-50/60 text-amber-900"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          {selected.requiresVerification && (
            <div className="flex items-center gap-2 mb-2 font-semibold text-amber-800">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>HIPAA verification required</span>
            </div>
          )}
          <p>{selected.description}</p>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={isPending}
        className="w-full h-14 text-base rounded-2xl font-semibold"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : selectedRole === "trustee" ? (
          "Continue to Verification"
        ) : (
          "Continue"
        )}
      </Button>
      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
        You can change your role or invite others after setup.
      </p>
    </div>
  );
}

function StepVerify({
  onBack,
  onSubmit,
  onChooseDifferent,
}: {
  onBack: () => void;
  onSubmit: () => void;
  onChooseDifferent: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  const requirements = [
    {
      icon: FileText,
      title: "Government-issued photo ID",
      detail: "Driver's license, passport, or state ID — scanned or photographed.",
    },
    {
      icon: ShieldCheck,
      title: "Reason for access",
      detail:
        "A brief statement confirming your relationship to the account holder and your need to access health-adjacent financial records.",
    },
    {
      icon: Users,
      title: "Authorization from Primary User",
      detail:
        "The Primary User must confirm your appointment as Trustee before access is granted.",
    },
  ];

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

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5 text-amber-700" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">
            Trustee Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Required under HIPAA (45 CFR §164.502) for access to health-adjacent
            financial records.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-1">
        <p className="text-sm font-semibold text-amber-900">
          Why is verification required?
        </p>
        <p className="text-sm text-amber-800 leading-relaxed">
          Trustee access includes insurance documents, medical bills, and other
          records that may contain Protected Health Information (PHI). Under US HIPAA
          law, anyone accessing PHI on behalf of another person must provide
          documented authorisation before access is granted.
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">You will need to provide:</p>
        <div className="space-y-3">
          {requirements.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    {r.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 flex gap-2.5 items-start">
        <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-muted-foreground leading-snug">
          Your identity documents are processed by a HIPAA-certified identity verification
          partner and are never stored by Kindue. Verification typically takes 1–2
          business days.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <button
          type="button"
          role="checkbox"
          aria-checked={agreed}
          onClick={() => setAgreed((v) => !v)}
          className={cn(
            "w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
            agreed
              ? "bg-primary border-primary"
              : "border-muted-foreground/40 group-hover:border-primary/60",
          )}
        >
          {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" aria-hidden="true" />}
        </button>
        <span className="text-sm text-muted-foreground leading-snug">
          I understand that my Trustee access will remain <strong className="text-foreground">pending</strong> until
          HIPAA verification is complete and the Primary User has approved my appointment.
        </span>
      </label>

      <Button
        onClick={onSubmit}
        disabled={!agreed}
        className="w-full h-14 text-base rounded-2xl font-semibold"
      >
        Submit Verification Request
      </Button>

      <button
        type="button"
        onClick={onChooseDifferent}
        className="text-sm font-medium text-muted-foreground hover:text-foreground text-center"
      >
        Choose a different role instead
      </button>
    </div>
  );
}

function StepHow({
  startMode,
  selectedRole,
  onBack,
  onPrimary,
  onSkip,
}: {
  startMode: StartMode;
  selectedRole: HouseholdRole;
  onBack: () => void;
  onPrimary: () => void;
  onSkip: () => void;
}) {
  const roleLabel =
    selectedRole === "caregiver"
      ? "caregivers"
      : selectedRole === "other"
        ? "viewers"
        : "caregivers";

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
          You can change this anytime. Most {roleLabel} start with view-only.
        </p>
      </div>

      <div className="space-y-3">
        <ModeCard
          selected={startMode === "view_only"}
          onClick={() => { /* only view_only is selectable today */ }}
          emoji="👀"
          title="View only — safest"
          description="We'll watch their email for bills and tell you what we find. We won't connect any bank accounts."
          subtitle="Takes 2 minutes · Connects Gmail (read-only)"
          recommended
        />
        <ModeCard
          selected={false}
          disabled
          comingSoon
          onClick={() => { /* disabled */ }}
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
          We never move money. You always approve any action.
        </p>
      </div>

      {selectedRole === "primary_user" && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Next: invite a Trustee</p>
            <p className="text-xs text-muted-foreground leading-snug">
              Most primary users add a Trustee (a sibling or spouse) so someone always
              has backup access. You can also add Caregivers and viewers anytime.
            </p>
          </div>
        </div>
      )}

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
      <p className="text-xs font-medium text-muted-foreground pl-8">{subtitle}</p>
    </button>
  );
}
