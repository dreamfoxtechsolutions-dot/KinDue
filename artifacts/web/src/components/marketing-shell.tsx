import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared header + footer for every public marketing page (Landing,
// Pricing, Security, Who it's for). Keeps nav and footer consistent
// so the Phase 1 voice never accidentally drifts page-to-page.
//
// The mobile menu is a simple disclosure rather than a Sheet — the
// nav is three links and two buttons, so a full-blown drawer would
// be overkill and add a dependency.

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/who-its-for", label: "Who it's for" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto w-full px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0"
            data-testid="link-marketing-home"
          >
            <Shield className="h-4 w-4" />
            <span className="font-serif text-xl font-medium tracking-tight">
              Kindue
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-border"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-3 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="py-1.5 text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  <Button size="sm" className="w-full">
                    Get started free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <span className="font-serif italic">
            Kindue by DreamFox LTD · Built for U.S. families
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1.5">
            <Link
              href="/who-its-for"
              className="hover:text-foreground transition-colors"
            >
              Who it's for
            </Link>
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/security"
              className="hover:text-foreground transition-colors"
            >
              Security
            </Link>
            <Link
              href="/faq"
              className="hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
          </nav>
          <span className="uppercase tracking-[0.2em]">
            Privacy-first by design
          </span>
        </div>
      </footer>
    </div>
  );
}
