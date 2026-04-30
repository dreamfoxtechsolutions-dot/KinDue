import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small explanatory state shown to caregiver / view-only members so
 * they understand why "Scan Bills" is disabled and why the dashboard
 * looks empty. The copy is intentionally non-judgmental — it's not
 * the user's fault their role can't trigger scans.
 */
export function ViewOnlyNotice({
  variant = "card",
  className,
}: {
  variant?: "card" | "inline";
  className?: string;
}) {
  if (variant === "inline") {
    return (
      <p
        className={cn(
          "text-xs text-muted-foreground inline-flex items-center gap-1.5",
          className,
        )}
      >
        <Eye className="h-3 w-3" aria-hidden />
        You're in view-only mode — ask the household admin to run a scan.
      </p>
    );
  }
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/40 p-4 flex items-start gap-3",
        className,
      )}
      role="status"
    >
      <div className="rounded-md border border-border bg-background p-1.5 shrink-0">
        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">You're in view-only mode</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Caregivers can't scan inboxes themselves. Ask the household
          admin to run a scan — anything they find will appear here.
        </p>
      </div>
    </div>
  );
}
