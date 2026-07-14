import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, AuthTokens, LoginResponse } from "@guild/shared-types";
import { useAuthStore } from "./auth-store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  refreshQueue = [];
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<ApiResponse<AuthTokens>>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
      );
      const tokens = data.data;
      useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
      processQueue(null, tokens.accessToken);
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export async function loginRequest(
  email: string,
  password: string,
  rememberMe = true,
) {
  return unwrap(
    api.post<ApiResponse<LoginResponse>>("/auth/login", {
      email,
      password,
      rememberMe,
    }),
  );
}

export async function logoutRequest() {
  const refreshToken = useAuthStore.getState().refreshToken;
  try {
    await api.post("/auth/logout", refreshToken ? { refreshToken } : undefined);
  } finally {
    useAuthStore.getState().clearAuth();
  }
}

export async function fetchMe() {
  return unwrap(api.get<ApiResponse<LoginResponse["user"]>>("/auth/me"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadFile(path: string, filename: string) {
  const response = await api.get(path, { responseType: "blob" });
  downloadBlob(response.data, filename);
}

export async function uploadFile<T>(path: string, file: File, fieldName = "file") {
  const formData = new FormData();
  formData.append(fieldName, file);
  const { data } = await api.post<ApiResponse<T>>(path, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export function getApiErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (typeof data?.message === "string") return data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
