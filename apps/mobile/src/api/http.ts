import type { ApiResponse } from '@moments/shared';
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';

/** 与服务端 ErrorCode 对应的前端常量 */
export const ApiCode = {
  OK: 0,
  UNAUTHORIZED: 40100,
  TOKEN_EXPIRED: 40101,
  NETWORK: -1,
} as const;

export class ApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 30_000,
});

instance.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

/** 并发请求同时遇到 token 过期时，只刷新一次 */
let refreshing: Promise<boolean> | null = null;

function refreshOnce() {
  const auth = useAuthStore();
  refreshing ??= auth.refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

instance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const body = error.response?.data;

    if (body?.code === ApiCode.TOKEN_EXPIRED && config && !config._retried) {
      config._retried = true;
      if (await refreshOnce()) return instance(config);
    }
    if (error.response?.status === 401) useAuthStore().clear();

    if (body && typeof body.code === 'number') {
      const details = (body as { details?: unknown }).details;
      const detailMsg = Array.isArray(details) ? `：${details[0]}` : '';
      throw new ApiError(body.code, body.message + detailMsg, error.response?.status, details);
    }
    throw new ApiError(ApiCode.NETWORK, error.code === 'ECONNABORTED' ? '请求超时，请重试' : '网络不太好，请稍后再试');
  },
);

/** 请求并解包 data；业务错误统一抛 ApiError */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await instance.request<ApiResponse<T>>(config);
  return res.data.data;
}
