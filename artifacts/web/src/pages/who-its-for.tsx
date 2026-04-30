import { Link } from "wouter";
import { Heart, Users, HandHeart, ArrowRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing-shell";

// Three persona cards in the visitor's own words. Helps a first-time
// visitor decide "is this for me?" in under thirty seconds without
// having to read marketing copy. Scenarios stay deliberately
// concrete — names, ages, locations — because vague personas
// ("busy professional") never resonate.

type Persona = {
  id: "adult-child" | "spouse" | "family";
  icon: React.ReactNode;
  badge: string;
  name: string;
  scenario: string;
  voice: string;
  helps: string[];
};

const PERSONAS: Persona[] = [
  {
    id: "adult-child",
    icon: <Heart className="h-4 w-4" />,
    badge: "Adult child",
    name: "Helping an aging parent from a distance",
    scenario:
      "My mom lives three states away. She's still sharp, but she missed a property tax payment last quarter and the late notice scared us both. I want to know what bills are coming without taking over her life.",
    voice: "Sarah, 47 — Denver, CO",
    helps: [
      "See her bill calendar without logging into her accounts",
      "Get a ping when something looks unusual or overdue",
      "Loop in your siblings without group-text chaos",
    ],
  },
  {
    id: "spouse",
    icon: <Users className="h-4 w-4" />,
    badge: "Spouse",
    name: "Carrying the household after a diagnosis",
    scenario:
      "After my husband's stroke, I took over every bill in the house overnight. I've never managed the gas company before. I just need a calm view of what's due, what's normal, and what isn't.",
    voice: "Linda, 68 — Tampa, FL",
    helps: [
      "One ledger for every household bill, in one place",
      "Quiet weekly digest so nothing slips through",
      "Flagged when an amount is way off the usual",
    ],
  },
  {
    id: "family",
    icon: <HandHeart className="h-4 w-4" />,
    badge: "Family circle",
    name: "Coordinating across siblings and an advisor",
    scenario:
      "There are four of us — my brothers and our parents' attorney — trying to steward Dad's affairs. We need everyone to see the same picture without forwarding emails for the rest of our lives.",
    voice: "Marcus, 52 — Atlanta, GA",
    helps: [
      "Roles and permissions instead of shared passwords",
      "Audit log so everyone sees who did what, when",
      "Read-only advisor seat (Trusted Circle tier)",
    ],
  },
];

export function WhoItsForPage() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Who it&apos;s for
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
          Built for the people doing the worrying.
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Kindue isn&apos;t a personal-finance app. It&apos;s a quiet
          co-pilot for the family member who keeps an eye on someone
          else&apos;s bills — whether that&apos;s an aging parent, a spouse
          recovering from a health event, or a family stewarding a
          relative&apos;s affairs.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-12 grid gap-5 md:grid-cols-3">
        {PERSONAS.map((p) => (
          <PersonaCard key={p.id} persona={p} />
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="font-serif text-2xl md:text-3xl font-medium tracking-tight">
          Sound familiar?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Setup takes about five minutes. Free to start, no credit card, and
          you can invite the rest of your circle any time.
        </p>
        <div className="mt-7">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <article
      className="rounded-md border border-border bg-card p-6 flex flex-col gap-4"
      data-testid={`card-persona-${persona.id}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border bg-background">
          {persona.icon}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          {persona.badge}
        </span>
      </div>
      <h3 className="font-serif text-lg font-medium tracking-tight leading-snug">
        {persona.name}
      </h3>
      <blockquote className="relative pl-6 text-sm text-foreground/90 leading-relaxed italic">
        <Quote
          className="absolute left-0 top-0 h-4 w-4 text-muted-foreground/40"
          aria-hidden="true"
        />
        {persona.scenario}
        <footer className="mt-2 not-italic text-xs text-muted-foreground">
          — {persona.voice}
        </footer>
      </blockquote>
      <div className="border-t border-border pt-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          How Kindue helps
        </p>
        <ul className="space-y-1.5 text-sm">
          {persona.helps.map((h) => (
            <li key={h} className="flex gap-2">
              <span className="text-muted-foreground/60 shrink-0">·</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto pt-2">
        <Link href="/sign-up">
          <Button variant="outline" className="w-full gap-2">
            Start free
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </article>
  );
}
