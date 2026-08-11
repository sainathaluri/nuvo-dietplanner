import { useQuery } from '@tanstack/react-query';
import { getUserRequest, listUsersRequest } from '../api/users.api';

// Server auto-scopes: dietitian gets only their assigned clients, admin gets everyone.
export function useClients() {
  return useQuery({ queryKey: ['users', 'clients'], queryFn: () => listUsersRequest({ role: 'client' }) });
}

export function useClient(clientId) {
  return useQuery({
    queryKey: ['users', clientId],
    queryFn: () => getUserRequest(clientId),
    enabled: Boolean(clientId),
  });
}
