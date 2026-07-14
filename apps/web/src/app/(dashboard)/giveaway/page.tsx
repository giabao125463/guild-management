"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Download,
  FileUp,
  Gift,
  RotateCcw,
  Sparkles,
  Trophy,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import {
  GiveawayFilterType,
  type GiveawayDto,
} from "@guild/shared-types";
import { Permission } from "@guild/shared-types";
import { hasPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import {
  useGenerateGiveaway,
  useGiveaway,
  useGiveaways,
  useGuildWarDays,
  useImportGiveawayCandidates,
  useRemoveGiveawayCandidates,
  useSpinGiveaway,
} from "@/hooks/use-api";
import { downloadFile, getApiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { SpinWheel, type SpinWheelSegment } from "@/components/spin-wheel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FILTER_LABELS: Record<GiveawayFilterType, string> = {
  [GiveawayFilterType.ALL_MATCHES_TODAY]: "Tham gia tất cả trận hôm nay",
  [GiveawayFilterType.MVP_TODAY]: "MVP hôm nay",
  [GiveawayFilterType.CUSTOM]: "Tùy chỉnh (Excel)",
};

function segmentsFromGiveaway(giveaway: GiveawayDto): SpinWheelSegment[] {
  const winnerSet = new Set(giveaway.winners.map((w) => w.memberId));
  const remainingIds = giveaway.candidateIds.filter((id) => !winnerSet.has(id));
  const nameMap = new Map(
    (giveaway.candidates ?? []).map((c) => [c.id, c.currentName] as const),
  );

  return remainingIds.map((id) => ({
    id,
    label: nameMap.get(id) ?? id.slice(0, 8),
  }));
}

export default function GiveawayPage() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canWrite = hasPermission(permissions, Permission.GIVEAWAY_WRITE);

  const [page, setPage] = React.useState(1);
  const [selectedDayId, setSelectedDayId] = React.useState("");
  const [filterType, setFilterType] = React.useState<GiveawayFilterType>(
    GiveawayFilterType.ALL_MATCHES_TODAY,
  );
  const [activeGiveawayId, setActiveGiveawayId] = React.useState<string | null>(
    null,
  );
  const [spinning, setSpinning] = React.useState(false);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);
  const [segments, setSegments] = React.useState<SpinWheelSegment[]>([]);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: days } = useGuildWarDays({ page: 1, limit: 50 });
  const { data: giveaways, isLoading } = useGiveaways({ page, limit: 10 });
  const { data: activeGiveaway, isFetching: loadingActive } = useGiveaway(
    activeGiveawayId ?? "",
  );
  const generateGiveaway = useGenerateGiveaway();
  const importCandidates = useImportGiveawayCandidates();
  const spinGiveaway = useSpinGiveaway();
  const removeCandidates = useRemoveGiveawayCandidates(activeGiveawayId ?? "");

  React.useEffect(() => {
    if (!activeGiveaway) return;
    setSegments(segmentsFromGiveaway(activeGiveaway));
  }, [activeGiveaway]);

  const selectGiveaway = (giveaway: GiveawayDto) => {
    setActiveGiveawayId(giveaway.id);
    setWinnerId(null);
    setSpinning(false);
    setSegments(segmentsFromGiveaway(giveaway));
  };

  const handleCreate = async () => {
    if (!selectedDayId) {
      toast.error("Vui lòng chọn ngày bang chiến");
      return;
    }

    try {
      let giveaway: GiveawayDto;

      if (filterType === GiveawayFilterType.CUSTOM) {
        if (!importFile) {
          toast.error("Vui lòng chọn file Excel danh sách thành viên");
          return;
        }
        giveaway = await importCandidates.mutateAsync({
          guildWarDayId: selectedDayId,
          file: importFile,
        });
      } else {
        giveaway = await generateGiveaway.mutateAsync({
          guildWarDayId: selectedDayId,
          filterType,
        });
      }

      toast.success(`Đã tạo vòng quay với ${giveaway.candidateCount} ứng viên`);
      selectGiveaway(giveaway);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tạo vòng quay"));
    }
  };

  const handleSpin = async () => {
    if (!activeGiveawayId || !activeGiveaway) {
      toast.error("Chọn hoặc tạo một vòng quay trước");
      return;
    }
    if (activeGiveaway.remainingCandidateCount <= 0) {
      toast.error("Vòng quay này đã hết ứng viên");
      return;
    }

    try {
      setSegments(segmentsFromGiveaway(activeGiveaway));
      setSpinning(true);
      setWinnerId(null);

      const result = await spinGiveaway.mutateAsync(activeGiveawayId);
      const latest = result.winners[result.winners.length - 1];
      setWinnerId(latest?.memberId ?? result.winnerMemberId);

      setTimeout(() => {
        setSpinning(false);
        setSegments(segmentsFromGiveaway(result));
        if (latest?.member) {
          toast.success(
            `Chúc mừng: ${latest.member.currentName} (giải #${latest.order})`,
          );
        }
      }, 4200);
    } catch (error) {
      setSpinning(false);
      toast.error(getApiErrorMessage(error, "Quay thưởng thất bại"));
    }
  };

  const currentWinners = activeGiveaway?.winners ?? [];
  const latestWinner = currentWinners[currentWinners.length - 1];
  const winnerIdSet = React.useMemo(
    () => new Set(currentWinners.map((w) => w.memberId)),
    [currentWinners],
  );
  const remainingCandidates = React.useMemo(() => {
    if (!activeGiveaway) return [];
    return (activeGiveaway.candidates ?? []).filter((c) => !winnerIdSet.has(c.id));
  }, [activeGiveaway, winnerIdSet]);

  const handleRemoveCandidate = async (memberId: string, name: string) => {
    if (!activeGiveawayId) return;
    try {
      const updated = await removeCandidates.mutateAsync([memberId]);
      selectGiveaway(updated);
      toast.success(`Đã loại ${name} khỏi vòng quay`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể loại thành viên"));
    }
  };

  const creating = generateGiveaway.isPending || importCandidates.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vòng quay may mắn"
        description="Mỗi vòng quay có danh sách trúng giải riêng — quay nhiều lần trên cùng một vòng"
      />

      {canWrite && (
        <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Tạo vòng quay mới</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Ngày bang chiến
                </p>
                <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                  <SelectTrigger className="relative h-10 min-w-[220px] rounded-xl border-primary/25 bg-background pl-10 font-medium shadow-sm">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <SelectValue placeholder="Chọn ngày" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {days?.data.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="rounded-lg">
                        {format(new Date(d.date), "dd/MM/yyyy")}
                        {d.note ? ` • ${d.note}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Bộ lọc ứng viên
                </p>
                <Select
                  value={filterType}
                  onValueChange={(v) => {
                    setFilterType(v as GiveawayFilterType);
                    setImportFile(null);
                  }}
                >
                  <SelectTrigger className="h-10 min-w-[240px] rounded-xl shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(FILTER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="rounded-lg">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreate} disabled={creating}>
                <Gift className="h-4 w-4" />
                {creating ? "Đang tạo..." : "Tạo vòng quay"}
              </Button>
            </div>

            {filterType === GiveawayFilterType.CUSTOM && (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                <p className="mb-3 text-sm font-medium">
                  Import Excel danh sách thành viên tham gia vòng quay
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  File cần cột <code className="rounded bg-muted px-1">name</code>{" "}
                  (tên thành viên).
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadFile(
                        "/giveaway/candidates/template",
                        "mau-ung-vien-vong-quay.xlsx",
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Tải mẫu Excel
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="max-w-xs cursor-pointer"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                  {importFile && (
                    <Badge variant="secondary" className="gap-1">
                      <FileUp className="h-3 w-3" />
                      {importFile.name}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Bánh xe quay thưởng
              </CardTitle>
              {activeGiveaway && (
                <Badge variant="outline">
                  Còn {activeGiveaway.remainingCandidateCount}/
                  {activeGiveaway.candidateCount} ứng viên
                </Badge>
              )}
            </div>
            {activeGiveaway && (
              <p className="text-xs text-muted-foreground">
                Vòng quay: {FILTER_LABELS[activeGiveaway.filterType]} • Tạo lúc{" "}
                {format(new Date(activeGiveaway.createdAt), "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            {loadingActive && activeGiveawayId ? (
              <Skeleton className="h-80 w-80 rounded-full" />
            ) : (
              <SpinWheel
                segments={segments}
                winnerId={winnerId}
                spinning={spinning}
                size={340}
              />
            )}

            <div className="flex flex-col items-center gap-3">
              {canWrite && (
                <Button
                  size="lg"
                  className="min-w-[200px] rounded-full px-8 text-base shadow-md"
                  onClick={handleSpin}
                  disabled={
                    spinning ||
                    !activeGiveaway ||
                    (activeGiveaway?.remainingCandidateCount ?? 0) <= 0
                  }
                >
                  <RotateCcw className={cn("h-5 w-5", spinning && "animate-spin")} />
                  {spinning ? "Đang quay..." : "Quay thưởng"}
                </Button>
              )}

              {!activeGiveaway && (
                <p className="text-sm text-muted-foreground">
                  Tạo vòng quay mới hoặc chọn một vòng trong lịch sử bên dưới
                </p>
              )}

              {latestWinner?.member && !spinning && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Người thắng gần nhất</p>
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                    #{latestWinner.order} — {latestWinner.member.currentName}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-amber-500" />
              Người trúng giải — vòng hiện tại
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {activeGiveaway
                ? `Đang xem vòng quay đã chọn (${currentWinners.length} giải)`
                : "Chưa chọn vòng quay"}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Giải</TableHead>
                  <TableHead>Thành viên</TableHead>
                  <TableHead>Mã TV</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentWinners.length > 0 ? (
                  [...currentWinners].reverse().map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <Badge variant="secondary">#{w.order}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {w.member?.currentName ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {w.member?.internalMemberId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(w.spunAt), "dd/MM HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {activeGiveaway
                        ? "Chưa có ai trúng giải trong vòng này"
                        : "Chọn một vòng quay để xem danh sách"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {activeGiveaway && remainingCandidates.length > 0 && (
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base">Ứng viên còn lại — có thể loại khỏi vòng quay</CardTitle>
            <p className="text-xs text-muted-foreground">
              Chỉ loại được thành viên chưa trúng giải ({remainingCandidates.length} người)
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thành viên</TableHead>
                  <TableHead>Mã TV</TableHead>
                  {canWrite && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {remainingCandidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.currentName}</TableCell>
                    <TableCell className="font-mono text-xs">{c.internalMemberId}</TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={removeCandidates.isPending || spinning}
                          onClick={() => handleRemoveCandidate(c.id, c.currentName)}
                        >
                          <UserMinus className="h-4 w-4" />
                          Loại
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử vòng quay</CardTitle>
          <p className="text-xs text-muted-foreground">
            Click một dòng để chọn vòng quay — danh sách trúng giải và bánh xe sẽ đổi theo
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Bộ lọc</TableHead>
                  <TableHead>Ứng viên</TableHead>
                  <TableHead>Còn lại</TableHead>
                  <TableHead>Số giải</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {giveaways?.data.map((g) => {
                  const selected = g.id === activeGiveawayId;
                  return (
                    <TableRow
                      key={g.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selected && "bg-primary/10",
                      )}
                      onClick={() => selectGiveaway(g)}
                    >
                      <TableCell>
                        {format(new Date(g.createdAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {FILTER_LABELS[g.filterType] ?? g.filterType}
                        </Badge>
                      </TableCell>
                      <TableCell>{g.candidateCount}</TableCell>
                      <TableCell>{g.remainingCandidateCount}</TableCell>
                      <TableCell>{g.winners?.length ?? 0}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectGiveaway(g);
                          }}
                        >
                          {selected ? "Đang chọn" : "Chọn"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {giveaways?.meta && (
            <Pagination
              page={giveaways.meta.page}
              totalPages={giveaways.meta.totalPages}
              onPageChange={setPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
