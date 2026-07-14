"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Download, FileUp, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getGameClassLabel } from "@guild/shared-utils";
import { Permission } from "@guild/shared-types";
import { hasPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import { downloadFile } from "@/lib/api";
import {
  useCreateMatch,
  useGuildWarDay,
  useImportParticipants,
} from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { AddParticipantsModal } from "@/components/guild-war/add-participants-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function GuildWarDayPage() {
  const params = useParams();
  const id = params.id as string;
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const { data: day, isLoading } = useGuildWarDay(id);
  const createMatch = useCreateMatch(id);
  const [matchDialogOpen, setMatchDialogOpen] = React.useState(false);
  const [matchName, setMatchName] = React.useState("");
  const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(null);
  const [participantsModal, setParticipantsModal] = React.useState<{
    matchId: string;
    matchName: string;
  } | null>(null);

  const importParticipants = useImportParticipants(selectedMatchId ?? "", id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!day) return null;

  const handleCreateMatch = async () => {
    if (!matchName.trim()) return;
    try {
      await createMatch.mutateAsync({ name: matchName });
      toast.success("Đã tạo trận");
      setMatchDialogOpen(false);
      setMatchName("");
    } catch {
      toast.error("Tạo trận thất bại");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, matchId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedMatchId(matchId);
    try {
      const result = await importParticipants.mutateAsync(file);
      toast.success(`Đã nhập ${result.inserted} người tham gia`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} dòng lỗi`);
      }
    } catch {
      toast.error("Nhập thất bại");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ngày bang chiến — ${format(new Date(day.date), "dd/MM/yyyy")}`}
        description={day.note ?? "Quản lý trận và người tham gia"}
      >
        <Button variant="outline" asChild>
          <Link href="/guild-war">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
        {hasPermission(permissions, Permission.GUILDWAR_WRITE) && (
          <Button onClick={() => setMatchDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Thêm trận
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        {day.matches?.map((match) => (
          <Card key={match.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{match.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {match.participantCount} người tham gia
                  {match.mvpMember && (
                    <> · MVP: <span className="font-medium">{match.mvpMember.currentName}</span></>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasPermission(permissions, Permission.GUILDWAR_WRITE) && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setParticipantsModal({ matchId: match.id, matchName: match.name })
                    }
                  >
                    <UserPlus className="h-4 w-4" />
                    Thêm nhiều người
                  </Button>
                )}
                {hasPermission(permissions, Permission.GUILDWAR_IMPORT) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadFile(
                          "/guild-war/participants/template",
                          "participants-template.xlsx",
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                      Mẫu
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <FileUp className="h-4 w-4" />
                        Nhập Excel
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={(e) => handleImport(e, match.id)}
                        />
                      </label>
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {match.participants && match.participants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Lớp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {match.participants.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">
                          {p.member?.internalMemberId}
                        </TableCell>
                        <TableCell>{p.member?.currentName}</TableCell>
                        <TableCell>
                          {p.member?.currentClass
                            ? getGameClassLabel(p.member.currentClass)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có người tham gia.</p>
              )}

              {match.mvpMember && (
                <Badge className="mt-3" variant="success">
                  MVP: {match.mvpMember.currentName}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}

        {(!day.matches || day.matches.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Chưa có trận nào trong ngày này. Tạo trận để bắt đầu.
            </CardContent>
          </Card>
        )}
      </div>

      {participantsModal && (
        <AddParticipantsModal
          open
          dayId={id}
          matchId={participantsModal.matchId}
          matchName={participantsModal.matchName}
          onOpenChange={(open) => {
            if (!open) setParticipantsModal(null);
          }}
        />
      )}

      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo trận</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="matchName">Tên trận</Label>
            <Input
              id="matchName"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              placeholder="Trận 1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateMatch} disabled={createMatch.isPending}>
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
