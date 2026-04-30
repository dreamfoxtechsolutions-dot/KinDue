import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  BadgeCheck,
  Eye,
  BellRing,
  Bell,
  ScanLine,
  Users,
  FileText,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogOut,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { PrivacyFooter } from "@/components/privacy-footer";

type SettingsAction =
  | { kind: "openSecurity" };

type SettingsRowId =
  | "verify"
  | "security"
  | (string & { readonly brand?: unique symbol });

interface SettingsRow {
  id?: SettingsRowId;
  href?: string;
  action?: SettingsAction;
  label: string;
  description: string;
  icon: typeof UserIcon;
  destructive?: boolean;
}

interface SettingsGroup {
  title: string;
  rows: SettingsRow[];
}

// Settings hub — a single landing page that gathers every preference,
// connection, and account-management surface in one scrollable list.
// The bottom-tab "Settings" entry points here so the user always lands
// on this overview rather than dropping straight into the profile form.
const GROUPS: SettingsGroup[] = [
  {
    title: "Account",
    rows: [
      {
        href: "/profile",
        label: "Profile",
        description: "Name, photo, and household contact",
        icon: UserIcon,
      },
      {
        id: "security",
        action: { kind: "openSecurity" },
        label: "Security",
        description:
          "Password, two-factor, email & phone, sign-in providers, active devices",
        icon: ShieldCheck,
      },
      {
        id: "verify",
        href: "/profile/verify",
        label: "Identity verification",
        description: "Confirm who you are for protected actions",
        icon: BadgeCheck,
      },
      {
        href: "/profile/display",
        label: "Display & accessibility",
        description: "Text size, contrast, and theme",
        icon: Eye,
      },
    ],
  },
  {
    title: "Alerts & notifications",
    rows: [
      {
        href: "/profile/alerts",
        label: "Bill alerts",
        description: "How early we warn you about due dates",
        icon: BellRing,
      },
      {
        href: "/profile/notifications",
        label: "Notification channels",
        description: "Email, push, and SMS preferences",
        icon: Bell,
      },
    ],
  },
  {
    title: "Connections",
    rows: [
      {
        href: "/scan",
        label: "Linked mail & financial accounts",
        description: "Manage what Kindue scans for bills",
        icon: ScanLine,
      },
      {
        href: "/subscriptions",
        label: "Recurring subscriptions",
        description: "Review what's auto-charging each month",
        icon: RefreshCw,
      },
      {
        href: "/settings/privacy",
        label: "Privacy summary",
        description: "What we read from Gmail · what we never store",
        icon: Lock,
      },
    ],
  },
  {
    title: "Household & records",
    rows: [
      {
        href: "/household",
        label: "Household members",
        description: "Caregivers and shared access",
        icon: Users,
      },
      {
        href: "/statement",
        label: "Statement",
        description: "Itemized history of household spending",
        icon: FileText,
      },
      {
        href: "/reports",
        label: "Reports",
        description: "Tax, estate, and yearly summaries",
        icon: FileText,
      },
    ],
  },
  {
    title: "Danger zone",
    rows: [
      {
        href: "/settings/delete-data",
        label: "Erase my parent's data",
        description:
          "Permanently remove every bill, subscription, and document",
        icon: Trash2,
        destructive: true,
      },
    ],
  },
];

export function SettingsPage() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const { signOut } = clerk;
  const [, setLocation] = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const initials =
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).trim() ||
    user?.username?.[0] ||
    user?.primaryEmailAddress?.emailAddress?.[0] ||
    "U";

  // Hide rows that represent one-time setup steps once they're done.
  // Verification: hide the row when the user is already verified.
  // Security: hide once MFA is enabled (the user can still reach the
  // security center from the Profile page if they need to change things).
  const verificationStatus = ((user?.unsafeMetadata ?? {}) as {
    verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
  }).verificationStatus ?? "unverified";
  const isVerified = verificationStatus === "verified";

  const mfaUser = user as
    | (typeof user & {
        totpEnabled?: boolean;
        backupCodeEnabled?: boolean;
        twoFactorEnabled?: boolean;
      })
    | null
    | undefined;
  const mfaEnabled = Boolean(
    mfaUser?.twoFactorEnabled ||
      mfaUser?.totpEnabled ||
      mfaUser?.backupCodeEnabled,
  );

  const shouldHideRow = (id?: string) => {
    if (id === "verify") return isVerified;
    if (id === "security") return mfaEnabled;
    return false;
  };

  const visibleGroups = GROUPS.map((g) => ({
    ...g,
    rows: g.rows.filter((r) => !shouldHideRow(r.id)),
  })).filter((g) => g.rows.length > 0);

  return (
    <AppShell>
      <>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Settings
            </p>
            <h1 className="font-serif text-2xl font-medium mt-1">
              Your preferences
            </h1>
            {isLoaded && user && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {user.fullName ?? user.username ?? "Your account"}
              </p>
            )}
          </div>

          {isLoaded && user && (
            <ProfileAvatarMenu
              imageUrl={user.imageUrl}
              fullName={user.fullName ?? user.username ?? "User"}
              initials={initials.toUpperCase()}
              verificationStatus={verificationStatus}
            />
          )}
        </div>

        {visibleGroups.map((group) => {
          const isOpen = openGroups[group.title] ?? false;
          const panelId = `settings-group-${group.title.replace(/\s+/g, "-").toLowerCase()}`;
          return (
          <section key={group.title} className="space-y-2">
            <button
              type="button"
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [group.title]: !isOpen,
                }))
              }
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center justify-between px-1 py-1 text-left rounded hover:bg-muted/40 transition-colors"
            >
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                {group.title}
              </span>
              <ChevronDown
                className={
                  "h-4 w-4 text-muted-foreground transition-transform " +
                  (isOpen ? "rotate-180" : "")
                }
              />
            </button>
            {isOpen && (
            <ul id={panelId} className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {group.rows.map((row) => {
                const Icon = row.icon;
                const isDestructive = row.destructive === true;
                const inner = (
                  <>
                    <span
                      className={
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                        (isDestructive
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary")
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          "font-medium text-sm " +
                          (isDestructive ? "text-destructive" : "")
                        }
                      >
                        {row.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {row.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </>
                );
                const itemClass =
                  "flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors w-full text-left";
                const key = row.href ?? row.label;
                return (
                  <li key={key}>
                    {row.action?.kind === "openSecurity" ? (
                      <button
                        type="button"
                        className={itemClass}
                        onClick={() => clerk.openUserProfile()}
                      >
                        {inner}
                      </button>
                    ) : (
                      <Link href={row.href!} className={itemClass}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            )}
          </section>
          );
        })}

        <Button
          variant="outline"
          className="w-full h-12 gap-2"
          onClick={() => {
            void signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
            setLocation("/");
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
        <PrivacyFooter />
      </>
    </AppShell>
  );
}

interface ProfileAvatarMenuProps {
  imageUrl?: string;
  fullName: string;
  initials: string;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
}

// Read-only avatar with verification ring + status badge. Tapping it
// jumps to the Edit Profile page where the actual photo editor lives.
function ProfileAvatarMenu({
  imageUrl,
  fullName,
  initials,
  verificationStatus,
}: ProfileAvatarMenuProps) {
  const ringClass =
    verificationStatus === "verified"
      ? "ring-emerald-600"
      : verificationStatus === "pending"
        ? "ring-amber-500"
        : "ring-destructive";

  const StatusBadge =
    verificationStatus === "verified" ? BadgeCheck : ShieldAlert;
  const badgeClass =
    verificationStatus === "verified"
      ? "bg-emerald-600 text-white"
      : verificationStatus === "pending"
        ? "bg-amber-500 text-white"
        : "bg-destructive text-destructive-foreground";

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div
        role="img"
        aria-label={`Profile photo · ${verificationStatus}`}
        className="relative"
      >
        <Avatar
          className={`h-14 w-14 ring-2 ring-offset-2 ring-offset-background ${ringClass}`}
        >
          <AvatarImage src={imageUrl} alt={fullName} />
          <AvatarFallback className="text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-background ${badgeClass}`}
        >
          <StatusBadge className="h-3 w-3" />
        </span>
      </div>
      <span
        className={
          "text-[10px] uppercase tracking-[0.16em] font-medium " +
          (verificationStatus === "verified"
            ? "text-emerald-700"
            : verificationStatus === "pending"
              ? "text-amber-700"
              : "text-destructive")
        }
      >
        {verificationStatus === "verified"
          ? "Verified"
          : verificationStatus === "pending"
            ? "Pending"
            : "Unverified"}
      </span>
    </div>
  );
}
