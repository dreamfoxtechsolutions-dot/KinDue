import { SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Kindue · For your family
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Create your family's account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            One account for the caregiver. You'll set up your loved one's
            household in the next step and can invite siblings any time.
          </p>
        </div>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          fallbackRedirectUrl={`${basePath}/`}
        />
      </div>
    </div>
  );
}
