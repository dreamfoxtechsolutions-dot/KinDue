import { useState } from "react";
import { Link } from "wouter";
import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing-shell";
import {
  WaitlistModal,
  type WaitlistTier,
} from "@/components/waitlist-modal";

// Public pricing page. We deliberately publish the tier shape and
// price points BEFORE billing is wired so we can validate the
// numbers with real visitors (paid CTAs go to a small email
// capture instead of Stripe). When billing ships, swap the Plus
// CTA from the modal to a checkout link.
//
// Honesty rules: anything that is not implemented is marked with
// "Coming soon" or sits behind the waitlist CTA — never present a
// future feature as if it's live today.

type Included = { label: string; included: boolean };

type Tier = {
  id: "free" | "plus" | "trusted_circle";
  name: string;
  tagline: string;
  price: string;
  cadence: string;
  badge?: string;
  features: Included[];
  cta: { kind: "signup" } | { kind: "waitlist"; tier: WaitlistTier };
  ctaLabel: string;
  emphasis?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Family Free",
    tagline: "For one caregiver getting started.",
    price: "$0",
    cadence: "forever",
    features: [
      { label: "1 caregiver, 1 household", included: true },
      { label: "Inbox-verified bill detection", included: true },
      { label: "Calendar & risk view", included: true },
      { label: "Basic alerts (overdue, shutoff risk)", included: true },
      { label: "Multiple co-caregivers", included: false },
      { label: "Weekly family digest email", included: false },
      { label: "Document vault & full audit history", included: false },
    ],
    cta: { kind: "signup" },
    ctaLabel: "Start free",
  },
  {
    id: "plus",
    name: "Family Plus",
    tagline: "For families sharing the load.",
    price: "$9.99",
    cadence: "per month · or $99 / year",
    badge: "Most caregivers pick this",
    emphasis: true,
    features: [
      { label: "Everything in Family Free", included: true },
      { label: "Up to 5 caregivers per household", included: true },
      { label: "Weekly family digest email", included: true },
      { label: "Full audit history & activity feed", included: true },
      { label: "Document vault (insurance cards, IDs)", included: true },
      { label: "Per-bill comments & claim tracking", included: true },
      { label: "Advisor seat (CPA, attorney)", included: false },
    ],
    cta: { kind: "waitlist", tier: "plus" },
    ctaLabel: "Notify me when it opens",
  },
  {
    id: "trusted_circle",
    name: "Trusted Circle",
    tagline: "For families with an advisor in the loop.",
    price: "$19.99",
    cadence: "per month",
    badge: "Early access",
    features: [
      { label: "Everything in Family Plus", included: true },
      { label: "Read-only advisor seat (CPA, attorney)", included: true },
      { label: "Extended monitoring (12 months history)", included: true },
      { label: "Priority caregiver support", included: true },
      { label: "Quarterly family financial review export", included: true },
    ],
    cta: { kind: "waitlist", tier: "trusted_circle" },
    ctaLabel: "Join the waitlist",
  },
];

export function PricingPage() {
  const [openWaitlist, setOpenWaitlist] = useState<WaitlistTier | null>(null);

  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Pricing
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
          Simple pricing, built for families.
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Start free for one caregiver. When your family is ready to share the
          load, Family Plus adds co-caregivers, the weekly digest, and a full
          audit trail. No surprises, no per-bill fees, no commission on
          anything we save you.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid gap-5 md:grid-cols-3">
        {TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            onWaitlist={(t) => setOpenWaitlist(t)}
          />
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-medium tracking-tight mb-3">
            Honest answers
          </h2>
          <Faq
            q="Is Kindue really free to start?"
            a="Yes. The Free tier is a real product, not a trial. One caregiver, one household, no credit card. You can stay on Free as long as it works for you."
          />
          <Faq
            q="Why isn't Family Plus available yet?"
            a="We're publishing pricing before turning on billing so we can validate the numbers with real families. Drop your email and we'll notify you the moment it goes live — and the price you see today is the price you'll pay."
          />
          <Faq
            q="Will you ever move money or auto-pay bills?"
            a="No. Kindue is read-only by design. We watch what's coming and tell your family — paying the bill is always done by a human, on the provider's own site or app."
          />
          <Faq
            q="What happens to my data if I cancel?"
            a="You can export everything as a printable monthly statement, then delete the household with one click. We don't keep a shadow copy."
          />
        </div>
      </section>

      <WaitlistModal
        tier={openWaitlist ?? "plus"}
        open={openWaitlist !== null}
        onOpenChange={(next) => {
          if (!next) setOpenWaitlist(null);
        }}
      />
    </MarketingShell>
  );
}

function TierCard({
  tier,
  onWaitlist,
}: {
  tier: Tier;
  onWaitlist: (t: WaitlistTier) => void;
}) {
  return (
    <div
      className={
        "rounded-md border p-6 flex flex-col gap-5 " +
        (tier.emphasis
          ? "border-foreground/20 bg-card shadow-sm"
          : "border-border bg-card")
      }
      data-testid={`card-tier-${tier.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-xl font-medium tracking-tight">
            {tier.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{tier.tagline}</p>
        </div>
        {tier.badge && (
          <span className="text-[10px] uppercase tracking-[0.18em] rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground shrink-0">
            {tier.badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-serif text-3xl font-medium">{tier.price}</span>
        <span className="text-xs text-muted-foreground">{tier.cadence}</span>
      </div>

      <ul className="space-y-2.5 text-sm flex-1">
        {tier.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2">
            {f.included ? (
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-700" />
            ) : (
              <X className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
            )}
            <span
              className={
                f.included ? "text-foreground" : "text-muted-foreground/70"
              }
            >
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {tier.cta.kind === "signup" ? (
        <Link href="/sign-up">
          <Button
            className="w-full gap-2"
            variant={tier.emphasis ? "default" : "outline"}
            data-testid={`button-tier-${tier.id}-cta`}
          >
            {tier.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <Button
          className="w-full"
          variant={tier.emphasis ? "default" : "outline"}
          onClick={() => {
            if (tier.cta.kind === "waitlist") onWaitlist(tier.cta.tier);
          }}
          data-testid={`button-tier-${tier.id}-cta`}
        >
          {tier.ctaLabel}
        </Button>
      )}
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <p className="text-sm font-medium">{q}</p>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a}</p>
    </div>
  );
}
