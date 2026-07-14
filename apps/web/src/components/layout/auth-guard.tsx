"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse, AuthTokens } from "@guild/shared-types";
import { useAuthStore } from "@/lib/auth-store";
import { api, fetchMe } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

async function refreshSession(): Promise<boolean> {
  const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
  if (!refreshToken) {
    clearAuth();
    return false;
  }

  try {
    const response = await api.post<ApiResponse<AuthTokens>>("/auth/refresh", {
      refreshToken,
    });
    const tokens = response.data.data;
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      clearAuth();
      return false;
    }
    setTokens(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

async function ensureSession(): Promise<boolean> {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (!accessToken && !refreshToken) return false;

  if (accessToken) {
    try {
      const user = await fetchMe();
      useAuthStore.getState().setUser(user);
      return true;
    } catch {
      // access hết hạn → refresh
    }
  }

  const refreshed = await refreshSession();
  if (!refreshed) return false;

  try {
    const user = await fetchMe();
    useAuthStore.getState().setUser(user);
    return true;
  } catch {
    useAuthStore.getState().clearAuth();
    return false;
  }
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const finish = () => setHasHydrated(true);
    const unsub = useAuthStore.persist.onFinishHydration(finish);
    if (useAuthStore.persist.hasHydrated()) finish();
    return unsub;
  }, [setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    (async () => {
      const ok = await ensureSession();
      if (cancelled) return;
      if (!ok) {
        router.replace("/login");
        setReady(false);
        return;
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, router]);

  if (!hasHydrated || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-64 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <p className="text-center text-xs text-muted-foreground">
            Đang khôi phục phiên đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
