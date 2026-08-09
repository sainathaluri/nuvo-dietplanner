import { axiosClient } from './axiosClient';

export const registerRequest = (payload) => axiosClient.post('/auth/register', payload).then((r) => r.data);
export const loginRequest = (payload) => axiosClient.post('/auth/login', payload).then((r) => r.data);
export const refreshRequest = () => axiosClient.post('/auth/refresh').then((r) => r.data);
export const logoutRequest = () => axiosClient.post('/auth/logout').then((r) => r.data);
export const meRequest = () => axiosClient.get('/auth/me').then((r) => r.data);
