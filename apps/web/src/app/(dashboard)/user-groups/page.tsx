"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  USER_GROUP_TYPES,
  USER_GROUP_TYPE_LABELS,
  type UserGroupDto,
  UserGroupType,
  Permission,
} from "@guild/shared-types";
import { hasPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import {
  useCreateUserGroup,
  useDeleteUserGroup,
  useUpdateUserGroup,
  useUserGroups,
} from "@/hooks/use-api";
import { getApiErrorMessage } from "@/lib/api";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type FormState = {
  name: string;
  type: UserGroupType;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  type: UserGroupType.KIM_LANG,
  description: "",
  sortOrder: 0,
  isActive: true,
};

export default function UserGroupsPage() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserGroupDto | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);

  const { data, isLoading } = useUserGroups({
    page,
    limit: 20,
    search: search || undefined,
    type: typeFilter !== "all" ? (typeFilter as UserGroupType) : undefined,
  });
  const createGroup = useCreateUserGroup();
  const updateGroup = useUpdateUserGroup();
  const deleteGroup = useDeleteUserGroup();

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (group: UserGroupDto) => {
    setEditing(group);
    setForm({
      name: group.name,
      type: group.type,
      description: group.description ?? "",
      sortOrder: group.sortOrder,
      isActive: group.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      if (editing) {
        await updateGroup.mutateAsync({ id: editing.id, ...payload });
        toast.success("Đã cập nhật user group");
      } else {
        await createGroup.mutateAsync(payload);
        toast.success("Đã tạo user group");
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể lưu user group"));
    }
  };

  const columns: ColumnDef<UserGroupDto>[] = [
    { accessorKey: "name", header: "Tên" },
    {
      accessorKey: "type",
      header: "Loại",
      cell: ({ row }) => USER_GROUP_TYPE_LABELS[row.original.type],
    },
    {
      accessorKey: "description",
      header: "Mô tả",
      cell: ({ row }) => row.original.description ?? "—",
    },
    {
      accessorKey: "memberCount",
      header: "Thành viên",
    },
    {
      accessorKey: "sortOrder",
      header: "Thứ tự",
    },
    {
      accessorKey: "isActive",
      header: "Trạng thái",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"}>
          {row.original.isActive ? "Hoạt động" : "Tắt"}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Cập nhật",
      cell: ({ row }) => format(new Date(row.original.updatedAt), "dd/MM/yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {hasPermission(permissions, Permission.USER_GROUP_WRITE) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {hasPermission(permissions, Permission.USER_GROUP_DELETE) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa user group?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sẽ xóa “{row.original.name}” và bỏ gán khỏi thành viên đang
                    thuộc nhóm này.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await deleteGroup.mutateAsync(row.original.id);
                        toast.success("Đã xóa user group");
                      } catch (error) {
                        toast.error(
                          getApiErrorMessage(error, "Không thể xóa user group"),
                        );
                      }
                    }}
                  >
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Group"
        description="Quản lý giá trị nhóm: Kim Lang, Team, Tình duyên"
      >
        {hasPermission(permissions, Permission.USER_GROUP_WRITE) && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm giá trị
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Tìm theo tên hoặc mô tả..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Lọc theo loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {USER_GROUP_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {USER_GROUP_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} />

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa user group" : "Thêm user group"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as UserGroupType })}
                disabled={Boolean(editing)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_GROUP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {USER_GROUP_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ug-name">Tên</Label>
              <Input
                id="ug-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ví dụ: Kim Lang Bắc, Team A, …"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ug-desc">Mô tả</Label>
              <Textarea
                id="ug-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Mô tả tùy chọn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ug-sort">Thứ tự</Label>
              <Input
                id="ug-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: Boolean(v) })}
              />
              Đang hoạt động
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={createGroup.isPending || updateGroup.isPending}
            >
              {createGroup.isPending || updateGroup.isPending
                ? "Đang lưu..."
                : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
