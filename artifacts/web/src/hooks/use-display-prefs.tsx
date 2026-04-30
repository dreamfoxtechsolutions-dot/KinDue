import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useUser } from "@clerk/react";
import {
  applyDisplayPrefsToDocument,
  DEFAULT_DISPLAY_PREFS,
  DISPLAY_PREFS_LOCAL_STORAGE_KEY,
  displayPrefsApi,
  type DisplayPreferences,
} from "@/lib/display-prefs-api";

type Ctx = {
  prefs: DisplayPreferences;
  loaded: boolean;
  update: (patch: Partial<DisplayPreferences>) => Promise<void>;
};

const DisplayPrefsContext = createContext<Ctx | null>(null);

const VALID_THEME_VARIANTS = new Set([
  "system",
  "default",
  "dark",
  "hc-light",
  "hc-dark",
]);

function readFromLocalStorage(): DisplayPreferences {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_PREFS;
  try {
    const raw = window.localStorage.getItem(DISPLAY_PREFS_LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_DISPLAY_PREFS;
    const parsed = JSON.parse(raw) as Partial<DisplayPreferences>;
    return {
      fontScale:
        parsed.fontScale === "large" || parsed.fontScale === "xlarge"
          ? parsed.fontScale
          : DEFAULT_DISPLAY_PREFS.fontScale,
      themeVariant:
        typeof parsed.themeVariant === "string" &&
        VALID_THEME_VARIANTS.has(parsed.themeVariant)
          ? (parsed.themeVariant as DisplayPreferences["themeVariant"])
          : DEFAULT_DISPLAY_PREFS.themeVariant,
      reducedMotion: parsed.reducedMotion === true,
    };
  } catch {
    return DEFAULT_DISPLAY_PREFS;
  }
}

function writeToLocalStorage(prefs: DisplayPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISPLAY_PREFS_LOCAL_STORAGE_KEY,
      JSON.stringify(prefs),
    );
  } catch {
    // ignore quota / disabled storage
  }
}

export function DisplayPrefsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [prefs, setPrefs] = useState<DisplayPreferences>(() =>
    readFromLocalStorage(),
  );
  const [loaded, setLoaded] = useState(false);
  const reconciledForUserRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      reconciledForUserRef.current = null;
      setLoaded(true);
      return;
    }
    if (reconciledForUserRef.current === user.id) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const requestedUserId = user.id;
    displayPrefsApi
      .get()
      .then((server) => {
        if (requestedUserId !== user.id) return;
        reconciledForUserRef.current = requestedUserId;
        setPrefs(server);
        writeToLocalStorage(server);
      })
      .catch(() => {})
      .finally(() => {
        inFlightRef.current = false;
        setLoaded(true);
      });
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    applyDisplayPrefsToDocument(prefs);
  }, [prefs]);

  // When the user picks "system", we re-resolve whenever the OS toggles
  // between light and dark so the app follows along live (e.g. macOS
  // auto-night-shift, iOS scheduled appearance). For any explicit theme
  // pick we don't subscribe — their choice wins.
  useEffect(() => {
    if (prefs.themeVariant !== "system") return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyDisplayPrefsToDocument(prefs);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, [prefs]);

  const update = useCallback(
    async (patch: Partial<DisplayPreferences>) => {
      let optimistic: DisplayPreferences | null = null;
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        optimistic = next;
        return next;
      });
      if (optimistic) writeToLocalStorage(optimistic);
      if (isSignedIn) {
        const server = await displayPrefsApi.update(patch);
        setPrefs(server);
        writeToLocalStorage(server);
      }
    },
    [isSignedIn],
  );

  const value = useMemo(() => ({ prefs, loaded, update }), [prefs, loaded, update]);
  return (
    <DisplayPrefsContext.Provider value={value}>
      {children}
    </DisplayPrefsContext.Provider>
  );
}

export function useDisplayPrefs(): Ctx {
  const ctx = useContext(DisplayPrefsContext);
  if (!ctx)
    throw new Error("useDisplayPrefs must be used inside <DisplayPrefsProvider>");
  return ctx;
}
