"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ALL_PERMISSIONS, type UserDto } from "@guild/shared-types";
import { Permission } from "@guild/shared-types";
import { hasPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import { useCreateUser, useDeleteUser, useUsers } from "@/hooks/use-api";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UsersPage() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    email: "",
    name: "",
    password: "",
    permissions: [] as string[],
  });

  const { data, isLoading } = useUsers({ page, limit: 20 });
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const columns: ColumnDef<UserDto>[] = [
    { accessorKey: "name", header: "Tên" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "permissions",
      header: "Quyền",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.permissions.length} quyền
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Trạng thái",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"}>
          {row.original.isActive ? "Hoạt động" : "Không hoạt động"}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Đăng nhập cuối",
      cell: ({ row }) =>
        row.original.lastLoginAt
          ? format(new Date(row.original.lastLoginAt), "dd/MM/yyyy HH:mm")
          : "—",
    },
    {
      id: "actions",
      cell: ({ row }) =>
        hasPermission(permissions, Permission.USER_DELETE) ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa người dùng?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sẽ vô hiệu hóa {row.original.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteUser.mutateAsync(row.original.id);
                    toast.success("Đã xóa người dùng");
                  }}
                >
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null,
    },
  ];

  const togglePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleCreate = async () => {
    try {
      await createUser.mutateAsync(form);
      toast.success("Đã tạo người dùng");
      setDialogOpen(false);
      setForm({ email: "", name: "", password: "", permissions: [] });
    } catch {
      toast.error("Tạo người dùng thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Người dùng" description="Quản lý tài khoản quản trị">
        {hasPermission(permissions, Permission.USER_WRITE) && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Thêm người dùng
          </Button>
        )}
      </PageHeader>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} />

      {data?.meta && (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo người dùng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tên</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Quyền</Label>
              <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={createUser.isPending}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
