import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  FolderOpen,
  AlertTriangle,
  ScrollText,
  Users,
  Settings,
  Menu,
  X,
  Shield,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Bills", href: "/bills", icon: FileText },
  { label: "Triage", href: "/triage", icon: AlertTriangle },
  { label: "Accounts", href: "/accounts", icon: CreditCard },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Household", href: "/household", icon: Users },
  { label: "Audit Log", href: "/audit", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NavLink({ item, collapsed }: { item: typeof navItems[0]; collapsed: boolean }) {
  const [location] = useLocation();
  const isActive = item.href === "/"
    ? location === "/"
    : location.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <a
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-semibold"
            : "text-sidebar-foreground/80"
        )}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </a>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-30 h-full flex flex-col bg-sidebar transition-all duration-200",
          "border-r border-sidebar-border",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Brand */}
        <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-sidebar-border", collapsed && "px-3")}>
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-sidebar-foreground font-bold text-lg tracking-tight">Kindue</span>
              <p className="text-sidebar-foreground/50 text-xs">Household Finance</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-sidebar-border p-3 flex items-center gap-3", collapsed && "justify-center")}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setCollapsed(true)}
            >
              <X size={14} />
            </Button>
          )}
          {collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-14 right-[-14px] w-7 h-7 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/60 hover:text-sidebar-foreground p-0"
              onClick={() => setCollapsed(false)}
            >
              <Menu size={12} />
            </Button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <span className="font-bold text-foreground">Kindue</span>
          <div className="ml-auto">
            <UserButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
