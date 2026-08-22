import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWeeklyHoursRequest,
  saveWeeklyHoursRequest,
  listAvailabilityExceptionsRequest,
  createAvailabilityExceptionRequest,
  deleteAvailabilityExceptionRequest,
} from '../api/availability.api';

export function useWeeklyHours() {
  return useQuery({ queryKey: ['availability', 'weekly-hours'], queryFn: getWeeklyHoursRequest });
}

export function useSaveWeeklyHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveWeeklyHoursRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', 'weekly-hours'] }),
  });
}

export function useAvailabilityExceptions() {
  return useQuery({ queryKey: ['availability', 'exceptions'], queryFn: listAvailabilityExceptionsRequest });
}

export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAvailabilityExceptionRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', 'exceptions'] }),
  });
}

export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAvailabilityExceptionRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', 'exceptions'] }),
  });
}
