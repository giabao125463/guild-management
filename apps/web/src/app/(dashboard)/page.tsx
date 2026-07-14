"use client";

import * as React from "react";
import Link from "next/link";
import { format, isFuture, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  Castle,
  Gift,
  Sparkles,
  Swords,
  TrendingUp,
  Users,
  UserX,
  ShieldAlert,
} from "lucide-react";
import {
  USER_GROUP_TYPE_LABELS,
  UserGroupType,
} from "@guild/shared-types";
import { useDashboardStats, useDungeons, useGuildWarDays } from "@/hooks/use-api";
import { useAuthStore } from "@/lib/auth-store";
import { RankList } from "@/components/dashboard/rank-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = [
  "hsl(173 58% 39%)",
  "hsl(215 28% 35%)",
  "hsl(173 45% 50%)",
  "hsl(215 20% 50%)",
  "hsl(173 35% 55%)",
  "hsl(215 25% 45%)",
  "hsl(173 50% 32%)",
];

const QUICK_LINKS = [
  { href: "/members", label: "Thành viên", icon: Users },
  { href: "/guild-war", label: "Bang chiến", icon: Swords },
  { href: "/dungeon", label: "Phụ bản", icon: Castle },
  { href: "/giveaway", label: "Vòng quay", icon: Gift },
  { href: "/reports", label: "Báo cáo chi tiết", icon: BarChart3 },
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground">
          <span className="font-medium text-foreground">{entry.name ?? entry.value}</span>
          {": "}
          {entry.value}
        </p>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading } = useDashboardStats();
  const { data: dungeonsData } = useDungeons({ page: 1, limit: 50 });
  const { data: warDaysData } = useGuildWarDays({ page: 1, limit: 20 });

  const upcomingDungeons = React.useMemo(() => {
    return (dungeonsData?.data ?? [])
      .filter((d) => isFuture(parseISO(d.scheduledAt)))
      .sort((a, b) => parseISO(a.scheduledAt).getTime() - parseISO(b.scheduledAt).getTime())
      .slice(0, 4);
  }, [dungeonsData?.data]);

  const upcomingWarDays = React.useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return (warDaysData?.data ?? [])
      .filter((d) => d.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [warDaysData?.data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tổng quan" description="Tổng quan hoạt động bang và chỉ số quan trọng" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (!stats) return null;

  const kimLangDistribution = stats.members.userGroupDistribution.filter(
    (row) => row.type === UserGroupType.KIM_LANG,
  );

  const activeRate =
    stats.members.total > 0
      ? Math.round((stats.members.active / stats.members.total) * 100)
      : 0;

  const avgMatchesPerDay =
    stats.guildWar.totalDays > 0
      ? (stats.guildWar.totalMatches / stats.guildWar.totalDays).toFixed(1)
      : "0";

  const userGroupByType = Object.values(UserGroupType).map((type) => {
    const groups = stats.members.userGroupDistribution.filter((g) => g.type === type);
    return {
      type,
      label: USER_GROUP_TYPE_LABELS[type],
      total: groups.reduce((sum, g) => sum + g.count, 0),
      active: groups.reduce((sum, g) => sum + g.activeCount, 0),
      groupCount: groups.length,
    };
  });

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description="Tổng quan hoạt động bang và chỉ số quan trọng"
      >
        <Button variant="outline" asChild>
          <Link href="/reports">
            <BarChart3 className="h-4 w-4" />
            Xem báo cáo đầy đủ
          </Link>
        </Button>
      </PageHeader>

      {/* Hero */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Bảng điều khiển bang
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {greeting}
                  {user?.name ? `, ${user.name}` : ""}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Bang hiện có{" "}
                  <span className="font-semibold text-foreground">{stats.members.total}</span>{" "}
                  thành viên,{" "}
                  <span className="font-semibold text-foreground">{stats.guildWar.totalMatches}</span>{" "}
                  trận bang chiến và{" "}
                  <span className="font-semibold text-foreground">{stats.dungeon.totalSchedules}</span>{" "}
                  lịch phụ bản.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button key={link.href} variant="secondary" size="sm" asChild>
                      <Link href={link.href}>
                        <Icon className="h-3.5 w-3.5" />
                        {link.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border bg-card/80 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-primary">{activeRate}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Tỷ lệ hoạt động</p>
              </div>
              <div className="rounded-xl border bg-card/80 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold">{avgMatchesPerDay}</p>
                <p className="mt-1 text-xs text-muted-foreground">Trận / ngày BC</p>
              </div>
              <div className="rounded-xl border bg-card/80 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold">{stats.giveaway.totalSpins}</p>
                <p className="mt-1 text-xs text-muted-foreground">Lượt quay thưởng</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng thành viên"
          value={stats.members.total}
          subtitle={`${stats.members.active} hoạt động · ${stats.members.inactive} không hoạt động`}
          icon={Users}
          href="/members"
          accent="primary"
          footer={
            stats.members.blacklisted > 0 ? (
              <Badge variant="destructive" className="mt-2">
                {stats.members.blacklisted} danh sách đen
              </Badge>
            ) : undefined
          }
        />
        <StatCard
          title="Bang chiến"
          value={stats.guildWar.totalDays}
          subtitle={`${stats.guildWar.totalMatches} trận · TB ${avgMatchesPerDay} trận/ngày`}
          icon={Swords}
          href="/guild-war"
          accent="blue"
        />
        <StatCard
          title="Vòng quay thưởng"
          value={stats.giveaway.totalSpins}
          subtitle={`${stats.giveaway.topWinners.length} người trúng nhiều nhất`}
          icon={Gift}
          href="/giveaway"
          accent="amber"
        />
        <StatCard
          title="Lịch phụ bản"
          value={stats.dungeon.totalSchedules}
          subtitle={`${stats.dungeon.mostActiveLeaders.length} trưởng nhóm tích cực`}
          icon={Castle}
          href="/dungeon"
          accent="violet"
        />
      </div>

      {/* Member health + upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tình trạng thành viên
            </CardTitle>
            <CardDescription>Phân bổ trạng thái trong bang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Đang hoạt động</span>
                <span className="font-semibold">
                  {stats.members.active} / {stats.members.total} ({activeRate}%)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${activeRate}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border bg-emerald-500/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.members.active}</p>
                  <p className="text-xs text-muted-foreground">Hoạt động</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border bg-muted/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <UserX className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.members.inactive}</p>
                  <p className="text-xs text-muted-foreground">Không hoạt động</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border bg-destructive/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.members.blacklisted}</p>
                  <p className="text-xs text-muted-foreground">Danh sách đen</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {userGroupByType.map((group) => (
                <div key={group.type} className="rounded-xl border p-3">
                  <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
                  <p className="mt-1 text-lg font-bold">{group.total}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {group.active} hoạt động · {group.groupCount} nhóm
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sắp tới</CardTitle>
            <CardDescription>Phụ bản và bang chiến gần nhất</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Phụ bản
              </p>
              {upcomingDungeons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có lịch sắp tới.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingDungeons.map((d) => (
                    <li key={d.id}>
                      <Link
                        href="/dungeon"
                        className="flex items-start justify-between gap-2 rounded-lg border p-2.5 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(d.scheduledAt), "dd/MM HH:mm", { locale: vi })}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {d.registeredCount}/{d.maxPlayers}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bang chiến
              </p>
              {upcomingWarDays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có ngày BC sắp tới.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingWarDays.map((day) => (
                    <li key={day.id}>
                      <Link
                        href={`/guild-war/${day.id}`}
                        className="flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-accent"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(`${day.date}T00:00:00`), "EEEE, dd/MM", { locale: vi })}
                          </p>
                          {day.note && (
                            <p className="truncate text-xs text-muted-foreground">{day.note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {day.matchCount} trận
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ lớp</CardTitle>
            <CardDescription>Số thành viên theo môn phái</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.members.classDistribution.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu lớp.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.members.classDistribution}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    label={({ label, percent }) =>
                      percent > 0.05 ? `${label} ${(percent * 100).toFixed(0)}%` : ""
                    }
                  >
                    {stats.members.classDistribution.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bổ Kim Lang</CardTitle>
            <CardDescription>Tổng và thành viên đang hoạt động</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {kimLangDistribution.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu Kim Lang.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kimLangDistribution} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Tổng" fill="hsl(173 58% 39%)" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="activeCount"
                    name="Hoạt động"
                    fill="hsl(215 28% 35%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top tham gia BC</CardTitle>
            <CardDescription>Thành viên tham gia bang chiến nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList
              items={stats.guildWar.attendanceRanking.map((r) => ({
                memberId: r.memberId,
                name: r.name,
                internalMemberId: r.internalMemberId,
                value: r.count,
              }))}
              valueLabel="trận"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top MVP</CardTitle>
            <CardDescription>Thành viên được bầu MVP nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList
              items={stats.guildWar.topMvp.map((r) => ({
                memberId: r.memberId,
                name: r.name,
                internalMemberId: r.internalMemberId,
                value: r.count,
              }))}
              valueLabel="MVP"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top đóng góp</CardTitle>
            <CardDescription>Điểm đóng góp (số trận BC)</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList
              items={stats.contribution.ranking.map((r) => ({
                memberId: r.memberId,
                name: r.name,
                internalMemberId: r.internalMemberId,
                value: r.points,
              }))}
              valueLabel="điểm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top trúng thưởng</CardTitle>
            <CardDescription>Thành viên trúng vòng quay nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList
              items={stats.giveaway.topWinners.map((r) => ({
                memberId: r.memberId,
                name: r.name,
                internalMemberId: r.internalMemberId,
                value: r.count,
              }))}
              valueLabel="lần trúng"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trưởng nhóm PB tích cực</CardTitle>
            <CardDescription>Số lần dẫn phụ bản</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList
              items={stats.dungeon.mostActiveLeaders.map((r) => ({
                memberId: r.memberId,
                name: r.name,
                internalMemberId: r.internalMemberId,
                value: r.count,
              }))}
              valueLabel="lần"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thành viên PB tích cực</CardTitle>
            <CardDescription>Số lần tham gia phụ bản</CardDescription>
          </CardHeader>
          <CardContent>
            <RankList
              items={stats.dungeon.mostActiveMembers.map((r) => ({
                memberId: r.memberId,
                name: r.name,
                internalMemberId: r.internalMemberId,
                value: r.count,
              }))}
              valueLabel="lần"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
