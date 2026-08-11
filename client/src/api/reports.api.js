import { axiosClient } from './axiosClient';

// params: { client? } — dietitian omits to see all their own clients' reports.
export const listReportsRequest = (params) => axiosClient.get('/reports', { params }).then((r) => r.data);

export const uploadReportRequest = ({ file, note }) => {
  const formData = new FormData();
  formData.append('file', file);
  if (note) formData.append('note', note);
  return axiosClient.post('/reports', formData).then((r) => r.data);
};

export const addReportFeedbackRequest = (reportId, payload) =>
  axiosClient.post(`/reports/${reportId}/feedback`, payload).then((r) => r.data);
