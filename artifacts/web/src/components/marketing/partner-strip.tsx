import { PARTNERS } from "@/lib/marketing-content";

// Logo strip for "As seen in / Trusted by". Empty until we have
// real, signed-off entries — same honesty rule as testimonials.
// We render plain wordmarks rather than image files so an editor
// can add an entry by typing one line in marketing-content.ts
// without needing a designer to source a logo.

export function PartnerStrip({ heading }: { heading?: string }) {
  if (PARTNERS.length === 0) return null;

  return (
    <section className="border-y border-border bg-card/40">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground text-center mb-3">
          {heading ?? "As featured in"}
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-serif italic text-muted-foreground">
          {PARTNERS.map((p) => (
            <li key={p.name}>
              {p.href ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  {p.name}
                </a>
              ) : (
                p.name
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
