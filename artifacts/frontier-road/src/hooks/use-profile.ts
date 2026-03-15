import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ProfileUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface ProfileResident {
  id: number;
  name: string;
  walletAddress: string | null;
  avatar: string | null;
  skills: string[];
  floor: number | null;
  status: string;
  bio: string | null;
  bountiesCompleted: number;
  bountiesCreated: number;
  totalEarned: number;
  userId: string | null;
}

export interface MeResponse {
  user: ProfileUser;
  resident: ProfileResident | null;
}

export function useMe() {
  return useQuery<MeResponse | null>({
    queryKey: ["me"],
    queryFn: async (): Promise<MeResponse | null> => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      skills?: string[];
      bio?: string;
      floor?: number;
      status?: string;
      walletAddress?: string;
      name?: string;
    }) => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
    },
  });
}

export function useLinkResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (residentId: number) => {
      const res = await fetch(`/api/me/link-resident/${residentId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
    },
  });
}
