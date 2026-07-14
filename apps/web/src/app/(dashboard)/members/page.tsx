"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Download, FileUp, Plus, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  GAME_CLASSES,
  GAME_CLASS_LABELS,
  type MemberDto,
  Permission,
  UserGroupType,
} from "@guild/shared-types";
import { getGameClassLabel, hasPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import { downloadFile } from "@/lib/api";
import {
  useDeleteMember,
  useImportMembers,
  useMembers,
  usePreviewMemberImport,
  useUserGroupOptions,
} from "@/hooks/use-api";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddMultipleMembersModal } from "@/components/members/add-multiple-members-modal";

export default function MembersPage() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [classFilter, setClassFilter] = React.useState<string>("all");
  const [kimLangFilter, setKimLangFilter] = React.useState<string>("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [addMultipleOpen, setAddMultipleOpen] = React.useState(false);

  const sortBy = sorting[0]?.id;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const { data: kimLangGroups } = useUserGroupOptions(UserGroupType.KIM_LANG);

  const { data, isLoading } = useMembers({
    page,
    limit: 20,
    search: search || undefined,
    sortBy,
    sortOrder: sortBy ? sortOrder : undefined,
    currentClass: classFilter !== "all" ? (classFilter as MemberDto["currentClass"]) : undefined,
    userGroupType: UserGroupType.KIM_LANG,
    userGroupId: kimLangFilter !== "all" ? kimLangFilter : undefined,
  });

  const deleteMember = useDeleteMember();
  const previewImport = usePreviewMemberImport();
  const importMembers = useImportMembers();

  const columns: ColumnDef<MemberDto>[] = [
    {
      accessorKey: "internalMemberId",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.internalMemberId}</span>
      ),
    },
    {
      accessorKey: "currentName",
      header: "Tên",
      cell: ({ row }) => (
        <Link href={`/members/${row.original.id}`} className="font-medium hover:text-primary">
          {row.original.currentName}
        </Link>
      ),
    },
    {
      accessorKey: "currentClass",
      header: "Lớp",
      cell: ({ row }) => getGameClassLabel(row.original.currentClass),
    },
    {
      id: "kimLang",
      header: "Kim Lang",
      cell: ({ row }) => row.original.kimLangUserGroup?.name ?? "—",
    },
    {
      id: "team",
      header: "Team",
      cell: ({ row }) => row.original.userGroups.TEAM?.name ?? "—",
    },
    {
      accessorKey: "contributionPoint",
      header: "Đóng góp (số trận BC)",
    },
    {
      accessorKey: "guildWarAttendanceCount",
      header: "Tham gia",
    },
    {
      accessorKey: "isActive",
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Badge variant={row.original.isActive ? "success" : "secondary"}>
            {row.original.isActive ? "Hoạt động" : "Không hoạt động"}
          </Badge>
          {row.original.isBlacklisted && <Badge variant="destructive">Danh sách đen</Badge>}
        </div>
      ),
    },
    {
      accessorKey: "joinDate",
      header: "Ngày vào bang",
      cell: ({ row }) =>
        row.original.joinDate ? format(new Date(row.original.joinDate), "dd/MM/yyyy") : "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        hasPermission(permissions, Permission.MEMBER_DELETE) ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sẽ xóa mềm {row.original.currentName}. Hành động này được ghi nhật ký.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteMember.mutateAsync(row.original.id);
                    toast.success("Đã xóa thành viên");
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      await previewImport.mutateAsync(file);
      setPreviewOpen(true);
    } catch {
      toast.error("Không thể xem trước file nhập");
    }
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      const result = await importMembers.mutateAsync(importFile);
      toast.success(`Đã nhập: ${result.inserted} mới, ${result.updated} cập nhật`);
      setPreviewOpen(false);
      setImportFile(null);
    } catch {
      toast.error("Nhập thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Thành viên" description="Quản lý thành viên bang và nhập/xuất dữ liệu">
        {hasPermission(permissions, Permission.MEMBER_WRITE) && (
          <>
            <Button onClick={() => setAddMultipleOpen(true)}>
              <Users className="h-4 w-4" />
              Add Multiple Members
            </Button>
            <Button variant="outline" onClick={() => router.push("/members/new")}>
              <Plus className="h-4 w-4" />
              Thêm thành viên
            </Button>
          </>
        )}
        {hasPermission(permissions, Permission.MEMBER_READ) && (
          <Button
            variant="outline"
            onClick={() => downloadFile("/members/export/excel", "members-export.xlsx")}
          >
            <Download className="h-4 w-4" />
            Xuất
          </Button>
        )}
        {hasPermission(permissions, Permission.MEMBER_IMPORT) && (
          <>
            <Button
              variant="outline"
              onClick={() => downloadFile("/members/template/excel", "members-template.xlsx")}
            >
              <Download className="h-4 w-4" />
              Mẫu
            </Button>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <FileUp className="h-4 w-4" />
                Nhập
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              </label>
            </Button>
          </>
        )}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Tìm theo tên hoặc ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Lọc theo lớp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả lớp</SelectItem>
            {GAME_CLASSES.map((c) => (
              <SelectItem key={c} value={c}>
                {GAME_CLASS_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={kimLangFilter}
          onValueChange={(v) => {
            setKimLangFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Lọc theo Kim Lang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Kim Lang</SelectItem>
            <SelectItem value="none">Chưa gán Kim Lang</SelectItem>
            {(kimLangGroups ?? []).map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
      />

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem trước nhập</DialogTitle>
            <DialogDescription>
              Kiểm tra các dòng hợp lệ trước khi nhập.
            </DialogDescription>
          </DialogHeader>
          {previewImport.data && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span>Tổng: {previewImport.data.summary.total}</span>
                <span className="text-emerald-600">Hợp lệ: {previewImport.data.summary.valid}</span>
                <span className="text-destructive">Không hợp lệ: {previewImport.data.summary.invalid}</span>
              </div>
              {previewImport.data.errors.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dòng</TableHead>
                      <TableHead>Lỗi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewImport.data.errors.map((err) => (
                      <TableRow key={err.row}>
                        <TableCell>{err.row}</TableCell>
                        <TableCell className="text-destructive">{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {previewImport.data.valid.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Lớp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewImport.data.valid.slice(0, 10).map((row) => (
                      <TableRow key={row.row}>
                        <TableCell className="font-mono text-xs">{row.internalMemberId}</TableCell>
                        <TableCell>{row.currentName}</TableCell>
                        <TableCell>{getGameClassLabel(row.currentClass)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Hủy</Button>
            <Button onClick={handleImport} disabled={importMembers.isPending}>
              {importMembers.isPending ? "Đang nhập..." : "Xác nhận nhập"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddMultipleMembersModal open={addMultipleOpen} onOpenChange={setAddMultipleOpen} />
    </div>
  );
}
