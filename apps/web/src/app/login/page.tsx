"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage, loginRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  rememberMe: z.boolean(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const rememberMe = watch("rememberMe");

  useEffect(() => {
    const finish = () => useAuthStore.getState().setHasHydrated(true);
    const unsub = useAuthStore.persist.onFinishHydration(finish);
    if (useAuthStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);

  useEffect(() => {
    if (hasHydrated && isAuthenticated()) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await loginRequest(
        data.email,
        data.password,
        data.rememberMe,
      );
      setAuth(
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.user,
        data.rememberMe,
      );
      toast.success(`Chào mừng, ${result.user.name}`);
      router.push("/");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Đăng nhập thất bại. Kiểm tra thông tin đăng nhập."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Quản lý bang</CardTitle>
          <CardDescription>Đăng nhập để quản lý bang hội</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@guild.local"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) =>
                  setValue("rememberMe", Boolean(checked), { shouldValidate: true })
                }
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Bật tùy chọn này để giữ phiên đăng nhập tối đa 90 ngày (không cần đăng nhập lại mỗi lần mở trang).
            </p>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
