import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDisplayPrefs } from "@/hooks/use-display-prefs";
import {
  type DisplayFontScale,
  type DisplayThemeVariant,
} from "@/lib/display-prefs-api";
import { Type, Contrast, Wind, Loader2, ChevronLeft } from "lucide-react";
import { Link as RouterLink } from "wouter";
import { useRef, type KeyboardEvent } from "react";

function useRadioKeyboardNav<T extends string>(
  options: readonly T[],
  active: T,
  onSelect: (next: T) => void,
) {
  const ref = useRef<HTMLDivElement | null>(null);
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const idx = options.indexOf(active);
    if (idx < 0) return;
    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIdx = (idx + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      nextIdx = (idx - 1 + options.length) % options.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = options.length - 1;
    else return;
    e.preventDefault();
    onSelect(options[nextIdx]);
    requestAnimationFrame(() => {
      const buttons = ref.current?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]',
      );
      buttons?.[nextIdx]?.focus();
    });
  }
  return { ref, onKeyDown };
}

const FONT_SCALES: { value: DisplayFontScale; label: string; sample: string }[] = [
  { value: "standard", label: "Standard", sample: "Aa" },
  { value: "large", label: "Large", sample: "Aa" },
  { value: "xlarge", label: "Extra Large", sample: "Aa" },
];

const THEME_VARIANTS: {
  value: DisplayThemeVariant;
  label: string;
  desc: string;
}[] = [
  {
    value: "system",
    label: "Match my device",
    desc: "Follow the system light/dark setting automatically. Switches live when your device toggles between day and night mode.",
  },
  {
    value: "default",
    label: "Light",
    desc: "The signature warm legal/banking aesthetic.",
  },
  {
    value: "dark",
    label: "Dark",
    desc: "Warm-slate dark palette. Easier on the eyes in dim rooms without the harshness of pure black.",
  },
  {
    value: "hc-light",
    label: "High contrast — light",
    desc: "Pure white background with deep black text. Easier on aging eyes in bright rooms.",
  },
  {
    value: "hc-dark",
    label: "High contrast — dark",
    desc: "Pure black background with bright text. Reduces glare in dim rooms.",
  },
];

export function ProfileDisplayPage() {
  const { prefs, loaded, update } = useDisplayPrefs();
  const fontNav = useRadioKeyboardNav(
    FONT_SCALES.map((o) => o.value) as readonly DisplayFontScale[],
    prefs.fontScale,
    (v) => update({ fontScale: v }),
  );
  const themeNav = useRadioKeyboardNav(
    THEME_VARIANTS.map((o) => o.value) as readonly DisplayThemeVariant[],
    prefs.themeVariant,
    (v) => update({ themeVariant: v }),
  );

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Display
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Senior-Friendly Display
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-prose">
            Make Kindue easier to read and easier to tap. Changes apply
            immediately and follow you across devices when you sign in.
          </p>
        </div>

        {!loaded && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your settings…
          </div>
        )}

        {/* Text size */}
        <section
          className="rounded-md border border-border bg-card p-6"
          aria-labelledby="display-text-size"
        >
          <div className="flex items-center gap-2 mb-1">
            <Type className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2
              id="display-text-size"
              className="font-serif text-xl font-medium tracking-tight"
            >
              Text size
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-prose">
            Larger sizes also enlarge buttons and form inputs so they're easier
            to tap.
          </p>
          <div
            ref={fontNav.ref}
            role="radiogroup"
            aria-labelledby="display-text-size"
            className="grid grid-cols-3 gap-3"
          >
            {FONT_SCALES.map((opt) => {
              const active = prefs.fontScale === opt.value;
              const sampleSize =
                opt.value === "standard"
                  ? "text-2xl"
                  : opt.value === "large"
                    ? "text-3xl"
                    : "text-4xl";
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  data-testid={`font-scale-${opt.value}`}
                  onClick={() => update({ fontScale: opt.value })}
                  onKeyDown={fontNav.onKeyDown}
                  className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 p-4 transition-colors ${
                    active
                      ? "border-foreground bg-accent"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <span className={`font-serif ${sampleSize}`}>{opt.sample}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Theme */}
        <section
          className="rounded-md border border-border bg-card p-6"
          aria-labelledby="display-theme"
        >
          <div className="flex items-center gap-2 mb-1">
            <Contrast className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2
              id="display-theme"
              className="font-serif text-xl font-medium tracking-tight"
            >
              Color & contrast
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-prose">
            High-contrast variants meet WCAG AA contrast requirements for
            normal text and interactive elements.
          </p>
          <div
            ref={themeNav.ref}
            role="radiogroup"
            aria-labelledby="display-theme"
            className="grid gap-3"
          >
            {THEME_VARIANTS.map((opt) => {
              const active = prefs.themeVariant === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  data-testid={`theme-${opt.value}`}
                  onClick={() => update({ themeVariant: opt.value })}
                  onKeyDown={themeNav.onKeyDown}
                  className={`text-left rounded-md border-2 p-4 transition-colors ${
                    active
                      ? "border-foreground bg-accent"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Reduced motion */}
        <section
          className="rounded-md border border-border bg-card p-6"
          aria-labelledby="display-motion"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h2
                  id="display-motion"
                  className="font-serif text-xl font-medium tracking-tight"
                >
                  Reduce motion
                </h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-prose">
                Turns off transitions, fades, and spinning loaders for users
                sensitive to motion.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="reduced-motion-toggle" className="text-sm">
                {prefs.reducedMotion ? "On" : "Off"}
              </Label>
              <Switch
                id="reduced-motion-toggle"
                data-testid="toggle-reduced-motion"
                checked={prefs.reducedMotion}
                onCheckedChange={(v) => update({ reducedMotion: v })}
                aria-label="Reduce motion"
              />
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
