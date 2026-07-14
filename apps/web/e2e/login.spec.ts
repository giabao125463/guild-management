import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Quản lý bang" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mật khẩu")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
  });

  test("shows validation for empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page.getByText("Email không hợp lệ")).toBeVisible();
  });
});
