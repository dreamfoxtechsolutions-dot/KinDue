import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/marketing-content";

// Renders nothing when we have no real quotes yet. Honesty rule
// from the task spec: "never a fake quote." We'd rather show no
// section at all than seed it with placeholder testimonials that
// later get replaced and quietly migrate into "almost real."

export function TestimonialSection() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="border-t border-border bg-card/40">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            From caregivers like you
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
            Real families, real relief.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.slice(0, 3).map((t, i) => (
            <figure
              key={i}
              className="rounded-md border border-border bg-card p-6 flex flex-col gap-4"
            >
              <Quote
                className="h-5 w-5 text-muted-foreground/40"
                aria-hidden="true"
              />
              <blockquote className="text-sm leading-relaxed text-foreground/90 italic">
                {t.quote}
              </blockquote>
              <figcaption className="text-xs text-muted-foreground mt-auto">
                <span className="font-medium text-foreground not-italic">
                  {t.attribution}
                </span>
                {t.context && (
                  <>
                    <span className="mx-1 opacity-50">·</span>
                    <span>{t.context}</span>
                  </>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
