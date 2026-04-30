import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { householdApi, type HouseholdMe } from "@/lib/household-api";

export const HOUSEHOLD_ME_KEY = ["household", "me"] as const;

export function useHouseholdMe(): UseQueryResult<HouseholdMe> {
  return useQuery({
    queryKey: HOUSEHOLD_ME_KEY,
    queryFn: () => householdApi.me(),
    staleTime: 30_000,
  });
}
