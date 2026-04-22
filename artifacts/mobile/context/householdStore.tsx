import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@kindue_household_id";

type HouseholdStoreCtx = {
  householdId: number | null;
  setHouseholdId: (id: number | null) => void;
};

const HouseholdStoreContext = createContext<HouseholdStoreCtx>({
  householdId: null,
  setHouseholdId: () => {},
});

export function HouseholdStoreProvider({ children }: { children: React.ReactNode }) {
  const [householdId, setHouseholdIdState] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setHouseholdIdState(Number(val));
    });
  }, []);

  const setHouseholdId = (id: number | null) => {
    setHouseholdIdState(id);
    if (id !== null) {
      AsyncStorage.setItem(STORAGE_KEY, String(id));
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <HouseholdStoreContext.Provider value={{ householdId, setHouseholdId }}>
      {children}
    </HouseholdStoreContext.Provider>
  );
}

export function useHouseholdStore() {
  return useContext(HouseholdStoreContext);
}
