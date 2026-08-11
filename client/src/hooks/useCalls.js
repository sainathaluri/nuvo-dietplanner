import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCallRequest, listCallsRequest, updateCallRequest } from '../api/calls.api';

// clientId scopes to one client's calls (used by the client's own detail drawer); omitted →
// the caller's own calls (client role: their calls; dietitian role: calls they're on).
export function useCalls(clientId) {
  return useQuery({
    queryKey: ['calls', clientId ?? 'mine'],
    queryFn: () => listCallsRequest(clientId ? { client: clientId } : undefined),
    enabled: clientId !== null,
  });
}

export function useCreateCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCallRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calls'] }),
  });
}

export function useUpdateCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, ...payload }) => updateCallRequest(callId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calls'] }),
  });
}
