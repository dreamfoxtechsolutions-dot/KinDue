import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineErrorProps {
  /** Friendly, plain-language headline. */
  title?: string;
  /** Optional second-line explanation. */
  description?: string;
  /** Called when the user taps the retry button. */
  onRetry?: () => void;
  /** True while the retry is in flight. */
  retrying?: boolean;
  /** Visual density. "compact" works inside cards/lists. */
  size?: "default" | "compact";
}

// A friendly inline error block. Designed so older / less-technical
// caregivers see a clear "something went wrong, here's the button to
// try again" right where the missing data should be — instead of a
// fleeting toast they might miss.
export function InlineError({
  title = "We couldn't load this",
  description = "Please check your connection and try again.",
  onRetry,
  retrying = false,
  size = "default",
}: InlineErrorProps) {
  const isCompact = size === "compact";
  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        "rounded-lg border border-destructive/30 bg-destructive/5 " +
        "flex items-start gap-3 " +
        (isCompact ? "p-3" : "p-4")
      }
    >
      <span
        className={
          "inline-flex shrink-0 items-center justify-center rounded-full " +
          "bg-destructive/15 text-destructive " +
          (isCompact ? "h-8 w-8" : "h-10 w-10")
        }
      >
        <AlertTriangle className={isCompact ? "h-4 w-4" : "h-5 w-5"} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={
            "font-medium text-foreground " +
            (isCompact ? "text-sm" : "text-base")
          }
        >
          {title}
        </p>
        {description ? (
          <p
            className={
              "text-muted-foreground mt-0.5 " +
              (isCompact ? "text-xs" : "text-sm")
            }
          >
            {description}
          </p>
        ) : null}
        {onRetry ? (
          <Button
            type="button"
            size={isCompact ? "sm" : "default"}
            variant="outline"
            className="mt-3 gap-2"
            onClick={onRetry}
            disabled={retrying}
          >
            <RefreshCw
              className={
                (isCompact ? "h-3.5 w-3.5" : "h-4 w-4") +
                (retrying ? " animate-spin" : "")
              }
            />
            {retrying ? "Trying again…" : "Try again"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
