import React, { createContext, useContext } from "react";
import { usePushNotifications, type PushDiagnostics } from "@/hooks/usePushNotifications";

const PushDiagnosticsContext = createContext<PushDiagnostics>({
  status: "idle",
  reason: null,
  token: null,
});

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const diagnostics = usePushNotifications();
  return (
    <PushDiagnosticsContext.Provider value={diagnostics}>
      {children}
    </PushDiagnosticsContext.Provider>
  );
}

export function usePushDiagnostics(): PushDiagnostics {
  return useContext(PushDiagnosticsContext);
}
