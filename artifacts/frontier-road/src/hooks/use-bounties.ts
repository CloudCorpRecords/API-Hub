import { useQueryClient } from "@tanstack/react-query";
import {
  useListBounties,
  useGetBounty,
  useCreateBounty,
  useClaimBounty,
  useCompleteBounty,
  useCancelBounty,
  getListBountiesQueryKey,
  getGetBountyQueryKey,
} from "@workspace/api-client-react";

export function useBounties(status?: any) {
  return useListBounties(status ? { status } : undefined);
}

export function useBounty(id: number) {
  return useGetBounty(id);
}

export function useCreateBountyMutation() {
  const queryClient = useQueryClient();
  return useCreateBounty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBountiesQueryKey() });
      },
    },
  });
}

export function useClaimBountyMutation() {
  const queryClient = useQueryClient();
  return useClaimBounty({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListBountiesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBountyQueryKey(variables.id) });
      },
    },
  });
}

export function useCompleteBountyMutation() {
  const queryClient = useQueryClient();
  return useCompleteBounty({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListBountiesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBountyQueryKey(variables.id) });
      },
    },
  });
}

export function useCancelBountyMutation() {
  const queryClient = useQueryClient();
  return useCancelBounty({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListBountiesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBountyQueryKey(variables.id) });
      },
    },
  });
}
