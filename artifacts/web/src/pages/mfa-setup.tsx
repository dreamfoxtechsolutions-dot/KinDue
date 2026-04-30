import { useUser, UserProfile } from "@clerk/react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MfaSetupPage() {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  const mfaEnabled =
    !!user &&
    (user.twoFactorEnabled ||
      user.totpEnabled ||
      user.backupCodeEnabled);

  // Once the user enables MFA, auto-advance them into the app.
  useEffect(() => {
    if (!isLoaded || !mfaEnabled) return;
    const t = setTimeout(() => setLocation("/"), 600);
    return () => clearTimeout(t);
  }, [isLoaded, mfaEnabled, setLocation]);

  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Step 2 of 2 · Account Security
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight mb-2">
          Enable two-factor authentication
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mb-6">
          Kindue requires two-factor authentication on every account because
          it stores bill data linked to verified provider emails. Set up an
          authenticator app or SMS code below to continue.
        </p>

        <div
          className={
            "mb-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm " +
            (mfaEnabled
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-destructive/30 bg-destructive/5 text-destructive")
          }
        >
          {mfaEnabled ? (
            <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />
          ) : (
            <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          )}
          <div>
            <div className="font-medium">
              {mfaEnabled
                ? "Two-factor authentication is active"
                : "Two-factor authentication is required"}
            </div>
            <div className="opacity-80 mt-0.5">
              {mfaEnabled
                ? "Redirecting to your dashboard…"
                : "Open the Security tab below and add an authenticator app, SMS code, or backup codes to unlock your dashboard."}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card overflow-hidden">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none border-0",
              },
            }}
          />
        </div>

        {mfaEnabled && (
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setLocation("/")}>Continue to dashboard</Button>
          </div>
        )}
      </div>
    </div>
  );
}
