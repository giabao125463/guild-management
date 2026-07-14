import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { AuthUser } from "@guild/shared-types";

const REMEMBER_KEY = "guild-auth-remember";

function getRememberFlag(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(REMEMBER_KEY);
  if (raw === null) return true;
  return raw === "1";
}

function setRememberFlag(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_KEY, value ? "1" : "0");
}

/** localStorage khi ghi nhớ; sessionStorage khi không — đóng tab sẽ hết phiên */
const authStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(name) ?? sessionStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    const remember = getRememberFlag();
    if (remember) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  rememberMe: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setRememberMe: (value: boolean) => void;
  setAuth: (
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
    rememberMe?: boolean,
  ) => void;
  setUser: (user: AuthUser) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      rememberMe: true,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setRememberMe: (value) => {
        setRememberFlag(value);
        set({ rememberMe: value });
      },
      setAuth: (accessToken, refreshToken, user, rememberMe = true) => {
        setRememberFlag(rememberMe);
        set({ accessToken, refreshToken, user, rememberMe });
      },
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () =>
        Boolean(get().accessToken || get().refreshToken),
    }),
    {
      name: "guild-auth",
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        rememberMe: state.rememberMe,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.rememberMe !== undefined) {
          setRememberFlag(state.rememberMe);
        }
      },
    },
  ),
);
