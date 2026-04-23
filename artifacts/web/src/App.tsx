import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, useAuth, RedirectToSignIn } from "@clerk/react";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import Dashboard from "@/pages/dashboard";
import Bills from "@/pages/bills";
import BillDetail from "@/pages/bill-detail";
import Accounts from "@/pages/accounts";
import Documents from "@/pages/documents";
import AuditLog from "@/pages/audit-log";
import Settings from "@/pages/settings";
import Household from "@/pages/household";
import Triage from "@/pages/triage";
import Onboarding from "@/pages/onboarding";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  // if (!isSignedIn) {
  //   return <RedirectToSignIn />;
  // }

  return <Component />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/sso-callback" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route
        path="/"
        component={() => <ProtectedRoute component={Dashboard} />}
      />
      <Route
        path="/bills"
        component={() => <ProtectedRoute component={Bills} />}
      />
      <Route
        path="/bills/:id"
        component={() => <ProtectedRoute component={BillDetail} />}
      />
      <Route
        path="/accounts"
        component={() => <ProtectedRoute component={Accounts} />}
      />
      <Route
        path="/documents"
        component={() => <ProtectedRoute component={Documents} />}
      />
      <Route
        path="/triage"
        component={() => <ProtectedRoute component={Triage} />}
      />
      <Route
        path="/audit"
        component={() => <ProtectedRoute component={AuditLog} />}
      />
      <Route
        path="/household"
        component={() => <ProtectedRoute component={Household} />}
      />
      <Route
        path="/settings"
        component={() => <ProtectedRoute component={Settings} />}
      />
      <Route
        path="/onboarding"
        component={() => <ProtectedRoute component={Onboarding} />}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={`${BASE}/`}
      signInUrl={`${BASE}/sign-in`}
      signUpUrl={`${BASE}/sign-up`}
      appearance={{
        variables: {
          colorPrimary: "#1a8fa0",
          colorBackground: "#ffffff",
          colorInputBackground: "#f5f8fa",
          colorText: "#1a2535",
          borderRadius: "0.5rem",
          fontFamily: "Inter, system-ui, sans-serif",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={BASE}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
