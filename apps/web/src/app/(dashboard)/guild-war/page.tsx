"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import type { GuildWarDayDto } from "@guild/shared-types";
import { Permission } from "@guild/shared-types";
import { hasPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import { useCreateGuildWarDay, useGuildWarDays, useSyncGuildWarSchedule } from "@/hooks/use-api";
import { getApiErrorMessage } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const EMPTY_PERMISSIONS: Permission[] = [];

const columns: ColumnDef<GuildWarDayDto>[] = [
  {
    accessorKey: "date",
    header: "Ngày",
    cell: ({ row }) => (
      <Link href={`/guild-war/${row.original.id}`} className="font-medium hover:text-primary">
        {format(new Date(row.original.date), "dd/MM/yyyy")}
      </Link>
    ),
  },
  {
    accessorKey: "matchCount",
    header: "Số trận",
  },
  {
    id: "autoCreated",
    header: "Nguồn",
    cell: ({ row }) =>
      row.original.autoCreated ? (
        <Badge variant="secondary">Tự động</Badge>
      ) : (
        <Badge variant="outline">Thủ công</Badge>
      ),
  },
  {
    accessorKey: "note",
    header: "Ghi chú",
    cell: ({ row }) => row.original.note ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
    cell: ({ row }) => format(new Date(row.original.createdAt), "dd/MM/yyyy"),
  },
];

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

export default function GuildWarPage() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions ?? EMPTY_PERMISSIONS);
  const canWrite = hasPermission(permissions, Permission.GUILDWAR_WRITE);

  const [page, setPage] = React.useState(1);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [date, setDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [allowNonSaturday, setAllowNonSaturday] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const { data, isLoading } = useGuildWarDays({ page, limit: 20 });
  const createDay = useCreateGuildWarDay();
  const syncSchedule = useSyncGuildWarSchedule();
  const tableData = data?.data ?? [];

  const resetForm = React.useCallback(() => {
    setDate("");
    setNote("");
    setAllowNonSaturday(true);
  }, []);

  const closePanel = React.useCallback(() => {
    setPanelOpen(false);
    resetForm();
  }, [resetForm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim()) {
      toast.error("Vui lòng nhập ngày");
      return;
    }
    if (!isValidDateInput(date.trim())) {
      toast.error("Ngày không hợp lệ. Dùng định dạng YYYY-MM-DD");
      return;
    }
    if (submitting || createDay.isPending) return;

    setSubmitting(true);
    try {
      const day = await createDay.mutateAsync({
        date: date.trim(),
        note: note.trim() || undefined,
        allowNonSaturday,
      });
      toast.success("Đã tạo ngày bang chiến");
      closePanel();
      router.push(`/guild-war/${day.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tạo ngày bang chiến"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncSchedule.mutateAsync();
      if (result.created > 0) {
        toast.success(`Đã tạo ${result.created} ngày bang chiến thứ Bảy`);
      } else {
        toast.info("Các ngày thứ Bảy tới đã được lên lịch sẵn");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể đồng bộ lịch"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bang chiến"
        description="Tự động tạo ngày thứ Bảy hàng tuần (mặc định 1 trận). Vào chi tiết ngày để chỉnh sửa trận và người tham gia."
      >
        {canWrite && (
          <>
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncSchedule.isPending}
            >
              <RefreshCw className={cn("h-4 w-4", syncSchedule.isPending && "animate-spin")} />
              Đồng bộ lịch T7
            </Button>
            <Button
            type="button"
            onClick={() => {
              if (panelOpen) {
                closePanel();
              } else {
                resetForm();
                setPanelOpen(true);
              }
            }}
          >
            <Plus className="h-4 w-4" />
            Thêm ngày bang chiến
          </Button>
          </>
        )}
      </PageHeader>

      {panelOpen && (
        <section className="rounded-lg border border-primary/30 bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Tạo ngày bang chiến mới</h2>
            <Button type="button" variant="ghost" size="icon" onClick={closePanel} aria-label="Đóng">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="war-date" className="text-sm font-medium">
                  Ngày bang chiến
                </label>
                <DatePicker
                  id="war-date"
                  value={date}
                  onChange={setDate}
                  placeholder="Chọn ngày bang chiến"
                />
                <p className="text-xs text-muted-foreground">
                  Khuyến nghị chọn thứ Bảy. Có thể tick cho phép ngày khác.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="war-note" className="text-sm font-medium">
                  Ghi chú
                </label>
                <textarea
                  id="war-note"
                  name="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú tùy chọn..."
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowNonSaturday}
                onChange={(e) => setAllowNonSaturday(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Cho phép ngày không phải thứ Bảy
            </label>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting || createDay.isPending}>
                {submitting || createDay.isPending ? "Đang tạo..." : "Tạo"}
              </Button>
              <Button type="button" variant="outline" onClick={closePanel}>
                Hủy
              </Button>
            </div>
          </form>
        </section>
      )}

      <DataTable columns={columns} data={tableData} isLoading={isLoading} />

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
