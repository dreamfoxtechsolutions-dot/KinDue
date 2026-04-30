import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield,
  Home as HomeIcon,
  CreditCard,
  Users,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";
import { ProxyBanner } from "@/components/proxy-banner";
import { FirstRunWelcome } from "@/components/first-run-welcome";

// Single source of truth for the top header and bottom tab bar so every
// page in the app has identical chrome. Pages just wrap their content in
// <AppShell>...</AppShell> instead of repeating the header/tab markup.

interface AppHeaderProps {
  /**
   * When set, renders a back arrow on the left of the header. Pass `true`
   * to use browser history (with a safe fallback to "/" when the user
   * landed here directly), or pass an explicit path to navigate to.
   */
  back?: boolean | string;
}

export function AppHeader({ back }: AppHeaderProps = {}) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (typeof back === "string") {
      setLocation(back);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  // When a back arrow is shown, the Kindue wordmark is centered in the
  // header. Otherwise it sits on the left next to the (absent) back slot.
  const Brand = (
    <Link href="/">
      <div className="flex items-center gap-2 cursor-pointer select-none">
        <Shield className="h-5 w-5 text-foreground" strokeWidth={2} />
        <span className="font-serif text-lg font-medium tracking-tight text-foreground">
          Kindue
        </span>
      </div>
    </Link>
  );

  if (back) {
    return (
      <header className="sticky top-0 z-10 grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border bg-sidebar px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="inline-flex items-center justify-center h-9 w-9 -ml-1 rounded-full text-foreground hover:bg-foreground/5 outline-none focus-visible:ring-2 focus-visible:ring-ring justify-self-start"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="flex justify-center min-w-0">{Brand}</div>
        <div className="flex items-center gap-2 justify-self-end">
          <NotificationBell />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-sidebar px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">{Brand}</div>
      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}

const BOTTOM_TABS: Array<{
  href: string;
  label: string;
  icon: typeof HomeIcon;
  match: (path: string) => boolean;
}> = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p) => p === "/" },
  {
    href: "/bills",
    label: "Bills",
    icon: CreditCard,
    match: (p) =>
      p.startsWith("/bills") ||
      p.startsWith("/subscriptions") ||
      p.startsWith("/statement") ||
      p.startsWith("/scan") ||
      p.startsWith("/reports"),
  },
  {
    href: "/household",
    label: "Family",
    icon: Users,
    match: (p) => p.startsWith("/household"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (p) =>
      p.startsWith("/settings") ||
      p.startsWith("/profile") ||
      p.startsWith("/admin") ||
      p.startsWith("/notifications"),
  },
];

export function BottomTabBar() {
  const [location, setLocation] = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-20 h-16 bg-sidebar border-t border-border flex items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]"
    >
      {BOTTOM_TABS.map((tab) => {
        const active = tab.match(location);
        const Icon = tab.icon;
        return (
          <button
            key={tab.href}
            type="button"
            onClick={() => setLocation(tab.href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
            <span
              className={cn(
                "text-[11px]",
                active ? "font-bold" : "font-medium",
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

interface AppShellProps {
  children: ReactNode;
  /**
   * When true, the children render directly inside the scroll area
   * without the default page-style padding/max-width container. Use this
   * for pages that manage their own outer spacing (e.g. simple-home).
   */
  bare?: boolean;
  /** Show a back arrow in the header. See AppHeader for behavior. */
  back?: boolean | string;
}

export function AppShell({ children, bare = false, back }: AppShellProps) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <AppHeader back={back} />
      <ProxyBanner />
      <FirstRunWelcome />
      <main className="flex-1">
        {bare ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 space-y-6">
            {children}
          </div>
        )}
      </main>
      <BottomTabBar />
    </div>
  );
}
