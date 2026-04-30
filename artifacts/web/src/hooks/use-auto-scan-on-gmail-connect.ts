// TODO: backend not implemented — re-enable once GET /bill-scan-status lands.
//
// This used to auto-fire a Gmail scan exactly once per session when the
// user connected Gmail but had zero bills. The status endpoint
// (`/bill-scan-status`) doesn't exist on the real backend yet, so we
// can't safely decide when to auto-scan. Until then this is a no-op so
// the import sites in App.tsx don't break.
export function useAutoScanOnGmailConnect(): void {
  // intentionally empty
}
