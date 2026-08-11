import { axiosClient } from './axiosClient';

// params: { role? } — dietitian is always auto-scoped server-side to their own assigned clients.
export const listUsersRequest = (params) => axiosClient.get('/users', { params }).then((r) => r.data);

export const getUserRequest = (userId) => axiosClient.get(`/users/${userId}`).then((r) => r.data);
