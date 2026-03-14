import { useQueryClient } from "@tanstack/react-query";
import {
  useListResidents,
  useGetResident,
  useCreateResident,
  useUpdateResident,
  getListResidentsQueryKey,
  getGetResidentQueryKey,
} from "@workspace/api-client-react";

export function useResidents(skill?: string) {
  return useListResidents(skill ? { skill } : undefined);
}

export function useResident(id: number) {
  return useGetResident(id);
}

export function useCreateResidentMutation() {
  const queryClient = useQueryClient();
  return useCreateResident({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
      },
    },
  });
}

export function useUpdateResidentMutation() {
  const queryClient = useQueryClient();
  return useUpdateResident({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResidentQueryKey(variables.id) });
      },
    },
  });
}
