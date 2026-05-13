// lib/api/axios.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { dispatchLogout, getStore } from './store-ref';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://wahala-ce1p.onrender.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const store = getStore();
  const token = store?.getState()?.auth?.accessToken as string | null | undefined;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      dispatchLogout();
    }
    return Promise.reject(error);
  }
);

export type ApiError = {
  message: string;
  status?: number;
};

export function extractApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return {
      message:
        data?.message ||
        data?.error ||
        err.message ||
        'Something went wrong. Please try again.',
      status: err.response?.status,
    };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: 'Something went wrong. Please try again.' };
}
