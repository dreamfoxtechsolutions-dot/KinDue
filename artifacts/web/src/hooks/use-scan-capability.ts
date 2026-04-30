import { useAuth } from "@clerk/react";
import {
  useGetBillScanStatus,
  getGetBillScanStatusQueryKey,
} from "@workspace/api-client-react";

/**
 * Lightweight wrapper around `/api/bills/scan-status` so any UI surface
 * can ask "is this user allowed to scan Gmail?" without each component
 * re-deriving role logic. Caregiver / view-only roles return
 * `canScan === false`; the server is the source of truth.
 *
 * Shares the same query key as `useAutoScanOnGmailConnect` so we don't
 * fire a second request on dashboard/bills pages.
 *
 * Tri-state on purpose: `canScan` is `undefined` until the request
 * resolves. Callers MUST treat `undefined` as "don't allow scan
 * clicks yet" — defaulting to `true` would let a caregiver tap
 * "Scan Bills" during the brief load window and still 403, which
 * is the exact bug this hook exists to prevent. Likewise we don't
 * default to `false`, because that would flash the view-only banner
 * at admins on every page load.
 */
export function useScanCapability(): {
  canScan: boolean | undefined;
  isLoaded: boolean;
} {
  const { isLoaded, isSignedIn } = useAuth();
  const status = useGetBillScanStatus({
    query: {
      queryKey: getGetBillScanStatusQueryKey(),
      enabled: isLoaded && !!isSignedIn,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });
  return {
    canScan: status.data?.canScan,
    isLoaded: isLoaded && !!status.data,
  };
}
