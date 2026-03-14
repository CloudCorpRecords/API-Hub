import {
  useGetTreasury,
  useListTransactions,
} from "@workspace/api-client-react";

export function useTreasuryOverview() {
  return useGetTreasury();
}

export function useTransactions(limit: number = 20) {
  return useListTransactions({ limit });
}
