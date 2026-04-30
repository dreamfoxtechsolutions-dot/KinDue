import { useState } from "react";
import { useUser } from "@clerk/react";
import { Redirect } from "wouter";
import type { ReactNode } from "react";
import { useHouseholdMe } from "@/hooks/use-household";
import { OnboardingWizard } from "@/components/onboarding-wizard";

/**
 * Gates a route: requires a signed-in user. Also surfaces the trust-first
 * onboarding wizard until the owner has answered "who are you managing
 * bills for?" — and we have not already shown them the wizard.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const household = useHouseholdMe();
  const [dismissed, setDismissed] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return <Redirect to="/sign-in" />;
  }

  const md = (user.unsafeMetadata ?? {}) as {
    onboardingWizardSeenAt?: string;
  };
  const wizardSeen = !!md.onboardingWizardSeenAt;
  const onboardingChoice = household.data?.household.onboardingChoice ?? "";
  const householdLoaded = household.isSuccess;
  const needsWizard =
    householdLoaded && onboardingChoice === "" && !wizardSeen && !dismissed;

  const defaultName =
    user.firstName ? `${user.firstName}'s household` : "My household";

  return (
    <>
      {children}
      {needsWizard && (
        <OnboardingWizard
          open
          defaultName={defaultName}
          onClose={() => setDismissed(true)}
        />
      )}
    </>
  );
}
