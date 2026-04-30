import { Link } from "wouter";
import {
  Mail,
  CalendarDays,
  FileText,
  ArrowRight,
  Inbox,
  Eye,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing-shell";
import { TrustBadgesRow } from "@/components/marketing/trust-badges-row";
import { TestimonialSection } from "@/components/marketing/testimonial-section";
import { PartnerStrip } from "@/components/marketing/partner-strip";
import { FAQS } from "@/components/marketing/faq-content";

export function LandingPage() {
  return (
    <MarketingShell>
      <>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 mb-5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              Free to start · No credit card
            </span>
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight leading-[1.05]">
            Help the people you love
            <br className="hidden sm:block" /> never miss a bill.
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Kindue is a quiet co-pilot for adult children, spouses, and
            family caregivers. We watch a loved one's bills from their inbox,
            flag anything unusual, and keep your family circle in the loop —
            without ever moving their money.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Create your free account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                I already have one
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground max-w-xl mx-auto">
            Older Americans lose an estimated{" "}
            <span className="font-mono text-foreground">$28.3 billion</span> a
            year to financial exploitation.{" "}
            <span className="text-foreground">
              Kindue helps your family see what's happening before it's too
              late.
            </span>
            <span className="block mt-1 opacity-70">
              Source: AARP, 2023.
            </span>
          </p>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-4 grid md:grid-cols-3 gap-4">
          <Feature
            icon={<Mail className="h-4 w-4" />}
            title="Inbox-verified bills"
            body="We only ingest bills from an allow-listed set of verified U.S. provider domains. Marketing emails and lookalike senders are never read."
          />
          <Feature
            icon={<CalendarDays className="h-4 w-4" />}
            title="Calendar + risk view"
            body="Every bill is scored — critical, high, medium, low — so the whole family can see the month at a glance."
          />
          <Feature
            icon={<FileText className="h-4 w-4" />}
            title="Shareable monthly statement"
            body="A clean printable ledger to share with siblings, advisors, or accountants — or save as PDF for your records."
          />
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              How it works
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
              Three steps to peace of mind.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Step
              number="01"
              icon={<Inbox className="h-4 w-4" />}
              title="Set up their account in about 5 minutes"
              body="Create a private household for your loved one and connect their inbox. Kindue reads only verified bill emails — nothing else."
            />
            <Step
              number="02"
              icon={<Eye className="h-4 w-4" />}
              title="Kindue watches quietly"
              body="Every bill is logged, scored for risk, and flagged when something looks off. We never move money or share outside your family circle."
            />
            <Step
              number="03"
              icon={<Bell className="h-4 w-4" />}
              title="You get a weekly digest and instant alerts"
              body="A calm weekly summary for everyone in the circle — plus immediate pings on shutoff risk, missed payments, and anything unusual."
            />
          </div>
        </section>

        {/* Trust strip — sourced from lib/marketing-content.ts so the
            same five facts appear identically here and on /security. */}
        <section className="border-t border-border bg-card/40">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <TrustBadgesRow />
          </div>
        </section>

        {/* Partner strip — empty by default; renders nothing until
            we have at least one real entry in marketing-content.ts. */}
        <PartnerStrip />

        {/* Testimonials — same conditional render rule as partners. */}
        <TestimonialSection />

        {/* FAQ preview — three of the seven hardest questions, with
            a See-all link to the dedicated /faq page. */}
        <section
          id="faq"
          className="max-w-5xl mx-auto px-6 py-16 border-t border-border"
        >
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Frequently asked
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
              Honest answers to the hard questions.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FAQS.slice(0, 3).map((f) => (
              <Link
                key={f.id}
                href={`/faq#${f.id}`}
                className="rounded-md border border-border bg-card p-5 flex flex-col gap-2 hover:border-foreground/30 transition-colors"
                data-testid={`landing-faq-preview-${f.id}`}
              >
                <h3 className="font-serif text-base font-medium tracking-tight">
                  {f.question}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {f.answer}
                </p>
                <span className="mt-1 text-xs font-medium text-foreground inline-flex items-center gap-1">
                  Read the full answer <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-7 text-center">
            <Link href="/faq">
              <Button variant="outline" className="gap-2">
                See all answers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
            Give your family one less thing to worry about.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Free to start. No credit card. Setup takes about five minutes — and
            you can invite siblings and other caregivers any time.
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
      </>
    </MarketingShell>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  body,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
          {number}
        </span>
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border text-foreground">
          {icon}
        </span>
      </div>
      <h3 className="font-serif text-lg font-medium tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

