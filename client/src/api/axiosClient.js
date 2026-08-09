import axios from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retried) throw error;
    config._retried = true;

    refreshPromise ??= axiosClient
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });

    const token = await refreshPromise.catch(() => null);
    if (!token) throw error;

    config.headers.Authorization = `Bearer ${token}`;
    return axiosClient(config);
  }
);
