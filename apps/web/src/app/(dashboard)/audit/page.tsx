"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import type { AuditLogDto } from "@guild/shared-types";
import { useAuditLogs } from "@/hooks/use-api";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AuditPage() {
  const [page, setPage] = React.useState(1);
  const [module, setModule] = React.useState("");
  const [action, setAction] = React.useState("");

  const { data, isLoading } = useAuditLogs({
    page,
    limit: 20,
    module: module || undefined,
    action: action || undefined,
  });

  const columns: ColumnDef<AuditLogDto>[] = [
    {
      accessorKey: "createdAt",
      header: "Thời gian",
      cell: ({ row }) => format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm:ss"),
    },
    {
      accessorKey: "userEmail",
      header: "Người dùng",
      cell: ({ row }) => row.original.userEmail ?? "—",
    },
    {
      accessorKey: "action",
      header: "Hành động",
      cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
    },
    { accessorKey: "module", header: "Module" },
    {
      accessorKey: "resourceId",
      header: "Tài nguyên",
      cell: ({ row }) =>
        row.original.resourceId ? (
          <span className="font-mono text-xs">{row.original.resourceId}</span>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "ipAddress",
      header: "IP",
      cell: ({ row }) => row.original.ipAddress ?? "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Nhật ký" description="Hoạt động hệ thống và lịch sử thay đổi" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Lọc theo module..."
          value={module}
          onChange={(e) => {
            setModule(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={action || "all"}
          onValueChange={(v) => {
            setAction(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Hành động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả hành động</SelectItem>
            <SelectItem value="LOGIN">LOGIN</SelectItem>
            <SelectItem value="CREATE">CREATE</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="IMPORT">IMPORT</SelectItem>
            <SelectItem value="EXPORT">EXPORT</SelectItem>
            <SelectItem value="SPIN_GIVEAWAY">SPIN_GIVEAWAY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} />

      {data?.meta && (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
