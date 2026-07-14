"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { getGameClassLabel } from "@guild/shared-utils";
import { useGlobalSearch } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = React.useState(initialQuery);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setQuery(initialQuery);
    setPage(1);
  }, [initialQuery]);

  const { data, isLoading, isFetching } = useGlobalSearch(query, page);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tìm kiếm"
        description="Tìm thành viên trong cơ sở dữ liệu bang"
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên hoặc ID..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {query.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Nhập ít nhất 2 ký tự để tìm.
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {isFetching ? "Đang tìm..." : `${data?.total ?? 0} kết quả cho "${query}"`}
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Không tìm thấy thành viên.
                  </TableCell>
                </TableRow>
              ) : (
                data?.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <span className="font-mono text-xs">{member.internalMemberId}</span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/members/${member.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {member.currentName}
                      </Link>
                    </TableCell>
                    <TableCell>{getGameClassLabel(member.currentClass)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={member.isActive ? "success" : "secondary"}>
                          {member.isActive ? "Hoạt động" : "Không hoạt động"}
                        </Badge>
                        {member.isBlacklisted && (
                          <Badge variant="destructive">Danh sách đen</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.total > 20 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
