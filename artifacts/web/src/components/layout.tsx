import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

interface LayoutProps {
  children: ReactNode;
  /**
   * Show a back arrow in the header. Defaults to true because virtually
   * every page that still uses Layout is a sub-page reached from the
   * Settings hub or another tab. Top-level tab pages (Family, alerts-
   * only home, invite landing) opt out by passing `back={false}`.
   */
  back?: boolean | string;
}

// Compatibility wrapper — every page used to import this Layout. It now
// just delegates to AppShell so the unified header + bottom tab bar are
// applied uniformly across the entire app without touching every page.
export function Layout({ children, back = true }: LayoutProps) {
  return <AppShell back={back}>{children}</AppShell>;
}
