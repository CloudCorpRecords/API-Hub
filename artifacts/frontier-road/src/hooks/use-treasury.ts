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

interface BittensorWallet {
  address: string;
  network: string;
  balanceTao: number;
  stakedTao: number;
  totalTao: number;
  explorerUrl: string;
  hasBittensorAi: boolean;
}

export function useBittensorWallet() {
  return useQuery<BittensorWallet>({
    queryKey: ["bittensor-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/bittensor/tower-wallet");
      if (!res.ok) throw new Error("Failed to fetch Bittensor wallet");
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

interface MetaplexAgent {
  registered: boolean;
  assetPublicKey: string | null;
  registrationUri: string | null;
  explorerUrl: string | null;
  network: string;
}

export function useMetaplexAgent() {
  return useQuery<MetaplexAgent>({
    queryKey: ["metaplex-agent"],
    queryFn: async () => {
      const res = await fetch("/api/metaplex/tower-agent");
      if (!res.ok) throw new Error("Failed to fetch Metaplex agent status");
      return res.json();
    },
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
