import { Lock } from "lucide-react";

/**
 * Inline chip rendered in place of a sensitive field's value when the
 * server has redacted it for the current viewer (non-Trustee). The API
 * sends a sibling `redactedFields: string[]` listing the field names that
 * were blanked; UI consumers check membership and render this instead of
 * the value.
 */
export function RedactedChip({ label = "Trustee access required" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
      aria-label={label}
      title={label}
    >
      <Lock className="h-3 w-3" aria-hidden="true" />
      <span aria-hidden="true">••••</span>
      <span className="sr-only">{label}</span>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </span>
  );
}

export function isRedacted(
  redactedFields: string[] | undefined,
  field: string,
): boolean {
  return Array.isArray(redactedFields) && redactedFields.includes(field);
}
