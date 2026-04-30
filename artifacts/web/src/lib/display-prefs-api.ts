import { customFetch } from "@workspace/api-client-react";

export type DisplayFontScale = "standard" | "large" | "xlarge";
export type DisplayThemeVariant =
  | "system"
  | "default"
  | "dark"
  | "hc-light"
  | "hc-dark";

export type DisplayPreferences = {
  fontScale: DisplayFontScale;
  themeVariant: DisplayThemeVariant;
  reducedMotion: boolean;
};

// New users default to `system` so the app respects whatever the device
// is set to (most caregivers use a household iPad / Windows machine that
// already follows the household's preferred mode). Users who explicitly
// set "default", "dark", or a high-contrast variant override this.
export const DEFAULT_DISPLAY_PREFS: DisplayPreferences = {
  fontScale: "standard",
  themeVariant: "system",
  reducedMotion: false,
};

export const DISPLAY_PREFS_LOCAL_STORAGE_KEY = "billguard:displayPrefs";

export const displayPrefsApi = {
  get: (): Promise<DisplayPreferences> =>
    customFetch("/api/user/display-preferences"),
  update: (body: Partial<DisplayPreferences>): Promise<DisplayPreferences> =>
    customFetch("/api/user/display-preferences", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// Resolves the user-facing theme pick to a concrete CSS theme. `system`
// reads the live OS preference; everything else passes through. Kept
// pure so it can be used both at runtime and in tests.
export function resolveActiveTheme(
  variant: DisplayThemeVariant,
): "default" | "dark" | "hc-light" | "hc-dark" {
  if (variant !== "system") return variant;
  if (typeof window === "undefined" || !window.matchMedia) return "default";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "default";
}

export function applyDisplayPrefsToDocument(prefs: DisplayPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.fontScale = prefs.fontScale;
  // `data-theme` is the *resolved* theme so CSS only ever needs to match
  // four concrete values. `data-theme-pref` preserves the user's intent
  // (e.g. "system") so debugging and the settings UI can read it back.
  root.dataset.themePref = prefs.themeVariant;
  root.dataset.theme = resolveActiveTheme(prefs.themeVariant);
  if (prefs.reducedMotion) root.dataset.reducedMotion = "1";
  else delete root.dataset.reducedMotion;
}
