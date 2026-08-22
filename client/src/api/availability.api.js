import { axiosClient } from './axiosClient';

export const getWeeklyHoursRequest = () => axiosClient.get('/availability/weekly-hours').then((r) => r.data);

export const saveWeeklyHoursRequest = (days) =>
  axiosClient.put('/availability/weekly-hours', { days }).then((r) => r.data);

export const listAvailabilityExceptionsRequest = () => axiosClient.get('/availability/exceptions').then((r) => r.data);

export const createAvailabilityExceptionRequest = (payload) =>
  axiosClient.post('/availability/exceptions', payload).then((r) => r.data);

export const deleteAvailabilityExceptionRequest = (id) =>
  axiosClient.delete(`/availability/exceptions/${id}`).then((r) => r.data);
