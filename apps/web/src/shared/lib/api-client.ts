import axios from 'axios';
import { appConfig } from '@/app/config';
import { normalizeApiError } from './api-error';

export const apiClient = axios.create({
  baseURL: appConfig.apiUrl,
  headers: { Accept: 'application/json' },
  timeout: 15_000,
  withCredentials: true,
});

apiClient.interceptors.request.use((request) => {
  if (typeof document === 'undefined' || /^(GET|HEAD|OPTIONS)$/iu.test(request.method ?? 'GET')) return request;
  const csrf = document.cookie.split('; ').find((entry) => entry.startsWith('amp_csrf='))?.slice('amp_csrf='.length);
  if (csrf) request.headers.set('x-csrf-token', decodeURIComponent(csrf));
  return request;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => Promise.reject(normalizeApiError(error)),
);
