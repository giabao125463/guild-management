"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { DungeonStatus, type DungeonScheduleDto } from "@guild/shared-types";
import { Permission } from "@guild/shared-types";
import { getGameClassLabel, hasPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import {
  useCancelDungeonRegistration,
  useCreateDungeon,
  useDungeons,
  useRegisterDungeon,
} from "@/hooks/use-api";
import { getApiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { MemberSearchPicker } from "@/components/members/member-search-picker";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DungeonStatus, string> = {
  [DungeonStatus.OPEN]: "Mở đăng ký",
  [DungeonStatus.FULL]: "Đã đủ người",
  [DungeonStatus.IN_PROGRESS]: "Đang chạy",
  [DungeonStatus.COMPLETED]: "Hoàn thành",
  [DungeonStatus.CANCELLED]: "Đã hủy",
};

const statusVariant: Record<
  DungeonStatus,
  "success" | "warning" | "secondary" | "destructive" | "default"
> = {
  [DungeonStatus.OPEN]: "success",
  [DungeonStatus.FULL]: "warning",
  [DungeonStatus.IN_PROGRESS]: "default",
  [DungeonStatus.COMPLETED]: "secondary",
  [DungeonStatus.CANCELLED]: "destructive",
};

export default function DungeonPage() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [month, setMonth] = React.useState(new Date());
  const [registerMember, setRegisterMember] = React.useState<
    Record<string, { id: string; internalMemberId: string; currentName: string } | null>
  >({});
  const [leaderMember, setLeaderMember] = React.useState<{
    id: string;
    internalMemberId: string;
    currentName: string;
  } | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    scheduledDate: "",
    scheduledTime: "20:00",
    maxPlayers: "6",
  });

  const { data, isLoading } = useDungeons({ page: 1, limit: 100 });
  const paged = useDungeons({ page, limit: 10 });
  const createDungeon = useCreateDungeon();
  const registerDungeon = useRegisterDungeon();
  const cancelRegistration = useCancelDungeonRegistration();

  const calendarDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const schedulesByDay = React.useMemo(() => {
    const list = data?.data ?? [];
    const map = new Map<string, DungeonScheduleDto[]>();
    for (const s of list) {
      const key = format(new Date(s.scheduledAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [data?.data]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      scheduledDate: "",
      scheduledTime: "20:00",
      maxPlayers: "6",
    });
    setLeaderMember(null);
  };

  const handleCreate = async () => {
    if (!form.title || !form.scheduledDate || !form.scheduledTime) {
      toast.error("Vui lòng nhập tiêu đề, ngày và giờ");
      return;
    }
    const scheduledAt = `${form.scheduledDate}T${form.scheduledTime}`;
    try {
      await createDungeon.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        maxPlayers: Number(form.maxPlayers),
        leaderId: leaderMember?.id || undefined,
      });
      toast.success("Đã tạo lịch phụ bản");
      setPanelOpen(false);
      resetForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tạo lịch phụ bản"));
    }
  };

  const handleRegister = async (dungeonId: string) => {
    const memberId = registerMember[dungeonId]?.id;
    if (!memberId) {
      toast.error("Chọn thành viên để đăng ký");
      return;
    }
    try {
      await registerDungeon.mutateAsync({ id: dungeonId, memberId });
      toast.success("Đăng ký thành công");
      setRegisterMember((prev) => ({ ...prev, [dungeonId]: null }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Đăng ký thất bại"));
    }
  };

  const handleCancel = async (dungeonId: string) => {
    const memberId = registerMember[dungeonId]?.id;
    if (!memberId) {
      toast.error("Chọn thành viên để hủy đăng ký");
      return;
    }
    try {
      await cancelRegistration.mutateAsync({ id: dungeonId, memberId });
      toast.success("Đã hủy đăng ký");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Hủy đăng ký thất bại"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Phụ bản" description="Tạo lịch, xem lịch và quản lý đăng ký">
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border bg-card p-1 shadow-sm">
            <Button
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
              Danh sách
            </Button>
            <Button
              size="sm"
              variant={view === "calendar" ? "default" : "ghost"}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
              Lịch
            </Button>
          </div>
          {hasPermission(permissions, Permission.DUNGEON_WRITE) && (
            <Button
              onClick={() => {
                resetForm();
                setPanelOpen((v) => !v);
              }}
            >
              <Plus className="h-4 w-4" />
              Tạo lịch phụ bản
            </Button>
          )}
        </div>
      </PageHeader>

      {panelOpen && (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Tạo lịch phụ bản mới</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tên phụ bản"
              />
            </div>
            <div className="space-y-2">
              <Label>Ngày diễn ra</Label>
              <DatePicker
                value={form.scheduledDate}
                onChange={(value) => setForm({ ...form, scheduledDate: value })}
                placeholder="Chọn ngày phụ bản"
              />
            </div>
            <div className="space-y-2">
              <Label>Giờ bắt đầu</Label>
              <Input
                type="time"
                className="rounded-xl shadow-sm"
                value={form.scheduledTime}
                onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Mô tả</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Số người tối đa</Label>
              <Input
                type="number"
                value={form.maxPlayers}
                onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Trưởng nhóm (tùy chọn)</Label>
              <MemberSearchPicker
                value={leaderMember?.id ?? null}
                selectedMember={leaderMember}
                onChange={(memberId, member) =>
                  setLeaderMember(
                    memberId && member
                      ? {
                          id: member.id,
                          internalMemberId: member.internalMemberId,
                          currentName: member.currentName,
                        }
                      : null,
                  )
                }
                placeholder="Tìm thành viên..."
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={handleCreate} disabled={createDungeon.isPending}>
                {createDungeon.isPending ? "Đang tạo..." : "Tạo lịch"}
              </Button>
              <Button variant="outline" onClick={() => setPanelOpen(false)}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {view === "calendar" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="capitalize">
              {format(month, "MMMM yyyy", { locale: vi })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
                Hôm nay
              </Button>
              <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const daySchedules = schedulesByDay.get(key) ?? [];
                const inMonth = isSameMonth(day, month);
                const today = isSameDay(day, new Date());
                return (
                  <div
                    key={key}
                    className={cn(
                      "min-h-24 rounded-xl border p-2 transition-colors",
                      inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                      today && "border-primary ring-1 ring-primary/40",
                    )}
                  >
                    <div className="mb-1 text-xs font-semibold">{format(day, "d")}</div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className="truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                          title={s.title}
                        >
                          {format(new Date(s.scheduledAt), "HH:mm")} {s.title}
                        </div>
                      ))}
                      {daySchedules.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{daySchedules.length - 3} nữa
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : isLoading || paged.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {(paged.data?.data ?? []).map((d) => (
              <Card key={d.id}>
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{d.title}</CardTitle>
                    <Badge variant={statusVariant[d.status]}>
                      {STATUS_LABEL[d.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(d.scheduledAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {d.description && <p className="text-sm">{d.description}</p>}
                  <p className="text-sm">
                    Trưởng nhóm:{" "}
                    <span className="font-medium">
                      {d.leader?.currentName ?? "Chưa có"}
                    </span>
                  </p>
                  <p className="text-sm">
                    Người chơi: {d.registeredCount}/{d.maxPlayers}
                  </p>
                  {d.requiredClasses?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {d.requiredClasses.map((c) => (
                        <Badge key={c} variant="outline">
                          {getGameClassLabel(c)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {hasPermission(permissions, Permission.DUNGEON_WRITE) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <MemberSearchPicker
                        className="min-w-[220px] max-w-xs flex-1"
                        value={registerMember[d.id]?.id ?? null}
                        selectedMember={registerMember[d.id]}
                        onChange={(memberId, member) =>
                          setRegisterMember((prev) => ({
                            ...prev,
                            [d.id]:
                              memberId && member
                                ? {
                                    id: member.id,
                                    internalMemberId: member.internalMemberId,
                                    currentName: member.currentName,
                                  }
                                : null,
                          }))
                        }
                        placeholder="Tìm thành viên..."
                      />
                      <Button size="sm" onClick={() => handleRegister(d.id)}>
                        <UserPlus className="h-4 w-4" />
                        Đăng ký
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(d.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                        Hủy
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {paged.data?.meta && (
            <Pagination
              page={paged.data.meta.page}
              totalPages={paged.data.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
