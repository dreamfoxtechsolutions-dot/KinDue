import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing-shell";
import { FAQS } from "@/components/marketing/faq-content";

// Standalone FAQ page. Same data feeds the landing-page preview
// section, so the answers stay identical in both places.

export function FaqPage() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Frequently asked
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
          The hard caregiver questions, answered honestly.
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          These are the seven questions we hear most often from adult
          children and spouses thinking about Kindue for someone they
          love. If you have a different one, email{" "}
          <a
            href="mailto:hello@billguard.app"
            className="underline underline-offset-2 hover:text-foreground"
          >
            hello@billguard.app
          </a>{" "}
          and we&apos;ll answer.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <ol className="space-y-4">
          {FAQS.map((f, idx) => (
            <li
              key={f.id}
              id={f.id}
              className="rounded-md border border-border bg-card p-6"
              data-testid={`faq-${f.id}`}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-muted-foreground tracking-[0.18em] mt-1 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="font-serif text-lg font-medium tracking-tight">
                    {f.question}
                  </h2>
                  <p className="mt-2 text-sm text-foreground/90 leading-relaxed">
                    {f.answer}
                  </p>
                  {f.link && (
                    <Link
                      href={f.link.href}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline underline-offset-2"
                    >
                      {f.link.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="font-serif text-2xl md:text-3xl font-medium tracking-tight">
          Still on the fence?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Family Free gives you the calendar, alerts, and bill detection
          for one caregiver. No credit card to start.
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
