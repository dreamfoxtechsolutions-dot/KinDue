import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show, useClerk, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { SimpleHome } from "@/pages/simple-home";
import { SimpleBills } from "@/pages/simple-bills";
import { SettingsPage } from "@/pages/settings";
import { DisplayPrefsProvider } from "@/hooks/use-display-prefs";
import { ProfileDisplayPage } from "@/pages/profile-display";
import { SubscriptionsPage } from "@/pages/subscriptions";
import { StatementPage } from "@/pages/statement";
import { ScanPage } from "@/pages/scan";
import { PrivacyPage } from "@/pages/privacy";
import { SettingsDeleteDataPage } from "@/pages/settings-delete-data";
import { ProfilePage } from "@/pages/profile";
import { ProfileEditPage } from "@/pages/profile-edit";
import { ProfileVerifyPage } from "@/pages/profile-verify";
import { ProfileAlertsPage } from "@/pages/profile-alerts";
import { ProfileNotificationsPage } from "@/pages/profile-notifications";
import { AdminPage } from "@/pages/admin";
import { HouseholdPage } from "@/pages/household";
import { EscalationsPage } from "@/pages/escalations";
import { ActivityPage } from "@/pages/activity";
import { InvitePage } from "@/pages/invite";
import { NotificationsPage } from "@/pages/notifications";
import { ReportsPage } from "@/pages/reports";
import { useBillAlerts } from "@/hooks/use-bill-alerts";
import { useGeoSampler } from "@/hooks/use-geo-suggestions";
import { useAutoScanOnGmailConnect } from "@/hooks/use-auto-scan-on-gmail-connect";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { MfaSetupPage } from "@/pages/mfa-setup";
import { LandingPage } from "@/pages/landing";
import { PricingPage } from "@/pages/pricing";
import { SecurityPage } from "@/pages/security";
import { WhoItsForPage } from "@/pages/who-its-for";
import { FaqPage } from "@/pages/faq";
import { AuthGate } from "@/components/auth-gate";

// Defaults tuned so that switching between bottom-tab pages always shows
// the latest server state. `refetchOnMount: "always"` is the key piece —
// each tab is its own route, so navigating to it remounts its queries
// and forces a refetch even if a cached value exists. We also refetch on
// window focus so changes another household member made show up when the
// user returns to the tab. The short staleTime prevents redundant fetches
// during quick interactions on a single page.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <AuthGate>
          <SimpleHome />
        </AuthGate>
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <AuthGate>{children}</AuthGate>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function BillAlertsRunner() {
  useBillAlerts();
  useGeoSampler();
  useAutoScanOnGmailConnect();
  return null;
}

function ClerkAuthTokenBridge() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setAuthTokenGetter(async () => {
        try {
          return (await getToken()) ?? null;
        } catch {
          return null;
        }
      });
    } else {
      setAuthTokenGetter(null);
    }
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/security" component={SecurityPage} />
      <Route path="/who-its-for" component={WhoItsForPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/mfa-setup" component={MfaSetupPage} />
      <Route path="/profile">
        <Protected>
          <ProfilePage />
        </Protected>
      </Route>
      <Route path="/profile/edit">
        <Protected>
          <ProfileEditPage />
        </Protected>
      </Route>
      <Route path="/profile/verify">
        <Protected>
          <ProfileVerifyPage />
        </Protected>
      </Route>
      <Route path="/profile/alerts">
        <Protected>
          <ProfileAlertsPage />
        </Protected>
      </Route>
      <Route path="/profile/notifications">
        <Protected>
          <ProfileNotificationsPage />
        </Protected>
      </Route>
      <Route path="/profile/display">
        <Protected>
          <ProfileDisplayPage />
        </Protected>
      </Route>
      <Route path="/bills">
        <Protected>
          <SimpleBills />
        </Protected>
      </Route>
      <Route path="/settings">
        <Protected>
          <SettingsPage />
        </Protected>
      </Route>
      <Route path="/settings/privacy">
        <Protected>
          <PrivacyPage />
        </Protected>
      </Route>
      <Route path="/settings/delete-data">
        <Protected>
          <SettingsDeleteDataPage />
        </Protected>
      </Route>
      <Route path="/subscriptions">
        <Protected>
          <SubscriptionsPage />
        </Protected>
      </Route>
      <Route path="/statement">
        <Protected>
          <StatementPage />
        </Protected>
      </Route>
      <Route path="/scan">
        <Protected>
          <ScanPage />
        </Protected>
      </Route>
      <Route path="/admin">
        <Protected>
          <AdminPage />
        </Protected>
      </Route>
      <Route path="/household">
        <Protected>
          <HouseholdPage />
        </Protected>
      </Route>
      <Route path="/household/escalations">
        <Protected>
          <EscalationsPage />
        </Protected>
      </Route>
      <Route path="/activity">
        <Protected>
          <ActivityPage />
        </Protected>
      </Route>
      <Route path="/notifications">
        <Protected>
          <NotificationsPage />
        </Protected>
      </Route>
      <Route path="/reports">
        <Protected>
          <ReportsPage />
        </Protected>
      </Route>
      <Route path="/invite/:token">
        <Protected>
          <InvitePage />
        </Protected>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkAuthTokenBridge />
        <ClerkQueryClientCacheInvalidator />
        <BillAlertsRunner />
        <DisplayPrefsProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </DisplayPrefsProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
