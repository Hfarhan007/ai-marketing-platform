import axios from 'axios';
import { appConfig } from '@/app/config';
import { normalizeApiError } from './api-error';

export const apiClient = axios.create({
  baseURL: appConfig.apiUrl,
  headers: { Accept: 'application/json' },
  timeout: 15_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => Promise.reject(normalizeApiError(error)),
);
