import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBillScanStatus,
  useScanBillsGmail,
  getListBillsQueryKey,
  getGetDashboardQueryKey,
  getListPendingBillsQueryKey,
  getGetBillScanStatusQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "./use-toast";

/**
 * Auto-fires a Gmail bill scan exactly once per session when:
 *   - the user is signed in,
 *   - at least one Gmail account is connected,
 *   - no scan has ever been recorded for this household, AND
 *   - the household currently has zero bills.
 *
 * This closes the "I connected Gmail but no bills appeared" gap — the
 * user used to have to find the "Scan Bills" button manually after the
 * connector flow returned them to the app.
 *
 * Mounted at the App root so it runs regardless of which page the user
 * lands on after the Gmail OAuth round-trip.
 */
export function useAutoScanOnGmailConnect(): void {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const firedRef = useRef(false);

  const status = useGetBillScanStatus({
    query: {
      queryKey: getGetBillScanStatusQueryKey(),
      enabled: isLoaded && !!isSignedIn,
      // We only need a fresh value once per session; no point polling.
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });

  const scan = useScanBillsGmail({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getListPendingBillsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetBillScanStatusQueryKey(),
        });
        // Only surface a toast when something was actually found — a
        // silent "0 bills" auto-scan shouldn't interrupt the user.
        if (data.newlyAdded > 0) {
          toast({
            title: "We just scanned your inbox",
            description: `Found ${data.newlyAdded} bill${data.newlyAdded === 1 ? "" : "s"} waiting for your review.`,
          });
        }
      },
      // Silent on error — the user can still hit "Scan Bills" manually
      // and see a real error toast there. We don't want a scary auto-fire
      // toast on a page they didn't ask to scan from.
    },
  });

  useEffect(() => {
    if (firedRef.current) return;
    if (!isLoaded || !isSignedIn) return;
    if (!status.data) return;
    const { canScan, gmailConnected, lastScanAt, billsCount } = status.data;
    // Caregiver / view-only roles can't trigger scans server-side, so
    // skip the auto-scan flow entirely for them. Otherwise we'd toast
    // "Scanning your inbox now" and immediately get a silent 403.
    if (!canScan) return;
    if (!gmailConnected) return;
    if (lastScanAt) return;
    if (billsCount > 0) return;
    firedRef.current = true;
    toast({
      title: "Connecting Gmail to Kindue…",
      description: "Scanning your inbox for upcoming bills now.",
    });
    scan.mutate();
  }, [isLoaded, isSignedIn, status.data, scan, toast]);
}
