import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addReportFeedbackRequest, listReportsRequest, uploadReportRequest } from '../api/reports.api';

// clientId scopes to one client's reports; omitted → the caller's own (client role) or all of a
// dietitian's assigned clients' reports (server default, see report.controller.js).
export function useReports(clientId) {
  return useQuery({
    queryKey: ['reports', clientId ?? 'mine'],
    queryFn: () => listReportsRequest(clientId ? { client: clientId } : undefined),
    enabled: clientId !== null,
  });
}

export function useUploadReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadReportRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useAddReportFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, ...payload }) => addReportFeedbackRequest(reportId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}
