import {
  useGetTreasury,
  useListTransactions,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";

export function useTreasuryOverview() {
  return useGetTreasury();
}

export function useTransactions(limit: number = 20) {
  return useListTransactions({ limit });
}

interface TowerWallet {
  address: string;
  network: string;
  balanceSol: number;
  explorerUrl: string;
  slot: number;
}

export function useTowerWallet() {
  return useQuery<TowerWallet>({
    queryKey: ["tower-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/solana/tower-wallet");
      if (!res.ok) throw new Error("Failed to fetch Tower wallet");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
