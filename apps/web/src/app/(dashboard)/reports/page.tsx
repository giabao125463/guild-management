"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReportData } from "@/hooks/use-api";
import { USER_GROUP_TYPE_LABELS, UserGroupType } from "@guild/shared-types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ReportsPage() {
  const { data, isLoading } = useReportData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kimLangDistribution = data.dashboard.members.userGroupDistribution.filter(
    (row) => row.type === UserGroupType.KIM_LANG,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Báo cáo" description="Phân tích và xếp hạng toàn diện" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Thành viên</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.dashboard.members.total}</p>
            <p className="text-xs text-muted-foreground">
              {data.dashboard.members.active} hoạt động · {data.dashboard.members.blacklisted} danh sách đen
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bang chiến</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.dashboard.guildWar.totalDays}</p>
            <p className="text-xs text-muted-foreground">
              {data.dashboard.guildWar.totalMatches} tổng số trận
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vòng quay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.dashboard.giveaway.totalSpins}</p>
            <p className="text-xs text-muted-foreground">Lượt quay hoàn thành</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Phụ bản</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.dashboard.dungeon.totalSchedules}</p>
            <p className="text-xs text-muted-foreground">Tổng lịch</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ lớp</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.classDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(173 58% 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bổ Kim Lang</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kimLangDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Tổng" fill="hsl(173 58% 39%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="activeCount" name="Hoạt động" fill="hsl(215 28% 35%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi tiết User Group</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nhóm</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead className="text-right">Hoạt động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.dashboard.members.userGroupDistribution.map((row) => (
                  <TableRow key={row.userGroupId}>
                    <TableCell>{USER_GROUP_TYPE_LABELS[row.type]}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{row.activeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Xếp hạng tham gia</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead className="text-right">Số lần</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.attendance).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top MVP</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead className="text-right">Số MVP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.mvp).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Xếp hạng đóng góp</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead className="text-right">Điểm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.contribution).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
