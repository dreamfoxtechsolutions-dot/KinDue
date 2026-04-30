import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "kindue:activeHouseholdId";

type ActiveHouseholdCtx = {
  householdId: number | null;
  setHouseholdId: (id: number | null) => void;
  ready: boolean;
};

const Context = createContext<ActiveHouseholdCtx>({
  householdId: null,
  setHouseholdId: () => {},
  ready: false,
});

function readFromStorage(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeToStorage(id: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function ActiveHouseholdProvider({ children }: { children: ReactNode }) {
  const [householdId, setHouseholdIdState] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHouseholdIdState(readFromStorage());
    setReady(true);
  }, []);

  const setHouseholdId = useCallback((id: number | null) => {
    setHouseholdIdState(id);
    writeToStorage(id);
  }, []);

  const value = useMemo(
    () => ({ householdId, setHouseholdId, ready }),
    [householdId, setHouseholdId, ready],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useActiveHousehold(): ActiveHouseholdCtx {
  return useContext(Context);
}
