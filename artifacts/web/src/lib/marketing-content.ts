// Editable content arrays for marketing surfaces. Phase 3 ships the
// scaffolding empty by design — testimonials and partner logos are
// shown only when this file actually contains entries, so we never
// render fake quotes or invented partnerships. Populate as we
// collect real ones.

export type Testimonial = {
  // Short attributable quote (1-3 sentences). Keep it real — this
  // is the page that has to earn a stranger's trust in 30 seconds.
  quote: string;
  attribution: string;
  context?: string;
};

export type Partner = {
  // Display name only. We deliberately don't ship logo files until
  // we have signed permission to use each brand's mark.
  name: string;
  // Optional href: "as featured in" stories link out, customer
  // partners typically don't.
  href?: string;
};

// Empty until we have real ones. The TestimonialSection component
// renders nothing when this is empty, so the page just collapses
// gracefully without leaving an obvious "fill me in" hole.
export const TESTIMONIALS: Testimonial[] = [];

export const PARTNERS: Partner[] = [];

// Trust badges, on the other hand, list facts about how the product
// is built today — they should already be true and verifiable on
// /security. Edit only when the underlying behavior changes.
export type TrustBadge = {
  iconKey:
    | "lock"
    | "eye-off"
    | "audit"
    | "users"
    | "shield"
    | "key"
    | "trash";
  label: string;
  detail: string;
};

export const TRUST_BADGES: TrustBadge[] = [
  {
    iconKey: "eye-off",
    label: "Read-only access",
    detail: "We can see bills, never accounts or balances.",
  },
  {
    iconKey: "lock",
    label: "Encrypted in transit and at rest",
    detail: "TLS 1.2+ on the wire, database-layer encryption at rest.",
  },
  {
    iconKey: "audit",
    label: "Full audit trail",
    detail: "Every caregiver action is logged for the whole circle.",
  },
  {
    iconKey: "users",
    label: "Family-only visibility",
    detail: "No data leaves your household. Ever.",
  },
  {
    iconKey: "trash",
    label: "One-click delete",
    detail: "Erase the household with one confirmation. No shadow copy.",
  },
];
