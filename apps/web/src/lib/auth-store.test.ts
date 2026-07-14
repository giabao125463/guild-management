import { beforeEach, describe, expect, it } from "vitest";
import { Permission } from "@guild/shared-types";
import { useAuthStore } from "./auth-store";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("starts unauthenticated", () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("stores auth and clears on logout", () => {
    const user = {
      id: "1",
      email: "admin@test.com",
      name: "Admin",
      permissions: [Permission.MEMBER_READ],
      isActive: true,
    };

    useAuthStore.getState().setAuth("access", "refresh", user);

    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("admin@test.com");

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
