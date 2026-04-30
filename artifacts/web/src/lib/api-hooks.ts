import {
  useGetHouseholdDashboard,
  useListBills as useListBillsRaw,
  getGetHouseholdDashboardQueryKey,
  getListBillsQueryKey,
  type ListBillsParams,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveHousehold } from "./active-household";

export { useScanGmail } from "@workspace/api-client-react";

export function useDashboard() {
  const { householdId } = useActiveHousehold();
  const id = householdId ?? 0;
  return useGetHouseholdDashboard(id, {
    query: {
      enabled: householdId != null,
      queryKey: getGetHouseholdDashboardQueryKey(id),
    },
  });
}

export function useBills(params?: ListBillsParams) {
  const { householdId } = useActiveHousehold();
  const id = householdId ?? 0;
  return useListBillsRaw(id, params, {
    query: {
      enabled: householdId != null,
      queryKey: getListBillsQueryKey(id, params),
    },
  });
}

export function usePendingBills() {
  return useBills({ status: "pending_approval" });
}

/**
 * Returns a function that invalidates the dashboard + bills + pending-bills
 * queries for the currently active household. No-op when no household
 * is selected.
 */
export function useInvalidateHouseholdData(): () => void {
  const { householdId } = useActiveHousehold();
  const qc = useQueryClient();
  return () => {
    if (householdId == null) return;
    qc.invalidateQueries({
      queryKey: getGetHouseholdDashboardQueryKey(householdId),
    });
    qc.invalidateQueries({
      queryKey: getListBillsQueryKey(householdId),
    });
    qc.invalidateQueries({
      queryKey: getListBillsQueryKey(householdId, {
        status: "pending_approval",
      }),
    });
  };
}
