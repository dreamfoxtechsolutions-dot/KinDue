import { Lock } from "lucide-react";

// Small persistent reassurance shown at the bottom of Settings and
// Profile screens. The Home dashboard already has a fuller trust
// message; this is the quieter sibling so caregivers feel covered
// without being shouted at on every page.
export function PrivacyFooter() {
  return (
    <p
      role="note"
      aria-label="Your information is private to your family"
      className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
    >
      <Lock className="h-3 w-3" aria-hidden="true" />
      <span>
        Health-grade privacy · Encrypted in transit and at rest · Private to
        your family
      </span>
    </p>
  );
}
