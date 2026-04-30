import {
  Lock,
  EyeOff,
  ListChecks,
  Users,
  Shield,
  KeyRound,
  Trash2,
} from "lucide-react";
import { TRUST_BADGES, type TrustBadge } from "@/lib/marketing-content";

// Reusable row of "things that are already true" — used on the
// landing page (replaces the older Trust strip) and on the
// security page so the same five facts are stated identically in
// both places. Source of truth is `lib/marketing-content.ts`; the
// only thing that should change here is the visual treatment.

const ICONS: Record<TrustBadge["iconKey"], React.ComponentType<{ className?: string }>> = {
  lock: Lock,
  "eye-off": EyeOff,
  audit: ListChecks,
  users: Users,
  shield: Shield,
  key: KeyRound,
  trash: Trash2,
};

export function TrustBadgesRow({
  variant = "row",
  className = "",
}: {
  variant?: "row" | "compact";
  className?: string;
}) {
  if (TRUST_BADGES.length === 0) return null;

  if (variant === "compact") {
    return (
      <ul
        className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground ${className}`}
        aria-label="What's already true about Kindue"
      >
        {TRUST_BADGES.map((b) => {
          const Icon = ICONS[b.iconKey];
          return (
            <li key={b.label} className="inline-flex items-center gap-1.5">
              <Icon className="h-3 w-3" aria-hidden="true" />
              <span>{b.label}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-5 gap-4 ${className}`}
      role="list"
      aria-label="What's already true about Kindue"
    >
      {TRUST_BADGES.map((b) => {
        const Icon = ICONS[b.iconKey];
        return (
          <div
            key={b.label}
            role="listitem"
            className="flex flex-col items-center text-center gap-2 p-3"
          >
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium">{b.label}</span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              {b.detail}
            </span>
          </div>
        );
      })}
    </div>
  );
}
