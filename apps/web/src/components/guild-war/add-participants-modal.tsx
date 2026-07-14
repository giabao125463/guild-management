"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AddParticipantsByNamesResult } from "@guild/shared-types";
import { useAddParticipantsByNames } from "@/hooks/use-api";
import {
  isPasteableNameData,
  parseClipboardNames,
} from "@/lib/parse-clipboard-names";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NameRow {
  clientId: string;
  name: string;
}

interface AddParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  dayId: string;
  matchName: string;
}

function createRow(name = ""): NameRow {
  return { clientId: crypto.randomUUID(), name };
}

function formatResultMessage(result: AddParticipantsByNamesResult): string {
  const parts = [`Đã thêm ${result.added} người`];
  if (result.notFound.length > 0) {
    parts.push(`${result.notFound.length} tên không tìm thấy`);
  }
  if (result.ambiguous.length > 0) {
    parts.push(`${result.ambiguous.length} tên trùng nhiều thành viên`);
  }
  return parts.join(". ");
}

export function AddParticipantsModal({
  open,
  onOpenChange,
  matchId,
  dayId,
  matchName,
}: AddParticipantsModalProps) {
  const addByNames = useAddParticipantsByNames(dayId);
  const [rows, setRows] = React.useState<NameRow[]>([]);
  const [pasteText, setPasteText] = React.useState("");
  const [discardOpen, setDiscardOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setRows([]);
      setPasteText("");
    }
  }, [open]);

  const validNames = React.useMemo(
    () =>
      [...new Set(rows.map((row) => row.name.trim()).filter(Boolean))],
    [rows],
  );

  const handleCloseRequest = React.useCallback(() => {
    if (rows.length > 0 || pasteText.trim()) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  }, [onOpenChange, pasteText, rows.length]);

  const importNames = React.useCallback((names: string[]) => {
    if (names.length === 0) {
      toast.error("Không có tên hợp lệ để nhập");
      return;
    }
    setRows((prev) => [...prev, ...names.map((name) => createRow(name))]);
  }, []);

  const handlePasteText = React.useCallback(
    (text: string, clearTextarea = false) => {
      const names = parseClipboardNames(text);
      if (names.length === 0) return false;
      importNames(names);
      if (clearTextarea) setPasteText("");
      return true;
    },
    [importNames],
  );

  const handleModalPaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData("text/plain");
      if (!text || !isPasteableNameData(text)) return;
      event.preventDefault();
      handlePasteText(text, true);
    },
    [handlePasteText],
  );

  const handleSave = React.useCallback(async () => {
    if (validNames.length === 0) {
      toast.error("Nhập ít nhất một tên");
      return;
    }

    try {
      const result = await addByNames.mutateAsync({ matchId, names: validNames });
      toast.success(formatResultMessage(result));

      if (result.notFound.length > 0) {
        toast.warning(`Không tìm thấy: ${result.notFound.join(", ")}`);
      }
      if (result.ambiguous.length > 0) {
        toast.warning(
          `Trùng tên: ${result.ambiguous.map((item) => item.name).join(", ")}`,
        );
      }

      onOpenChange(false);
    } catch (error: unknown) {
      const payload =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: AddParticipantsByNamesResult & { message?: string } } })
              .response?.data
          : undefined;

      if (payload?.notFound?.length || payload?.ambiguous?.length) {
        toast.error(payload.message ?? "Không thêm được người tham gia");
        if (payload.notFound?.length) {
          toast.warning(`Không tìm thấy: ${payload.notFound.join(", ")}`);
        }
        if (payload.ambiguous?.length) {
          toast.warning(
            `Trùng tên: ${payload.ambiguous.map((item) => item.name).join(", ")}`,
          );
        }
        return;
      }

      toast.error("Thêm người tham gia thất bại");
    }
  }, [addByNames, matchId, onOpenChange, validNames]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) handleCloseRequest();
        }}
      >
        <DialogContent
          className="flex max-h-[92vh] max-w-3xl flex-col gap-4 overflow-hidden p-0 sm:rounded-lg"
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            handleCloseRequest();
          }}
        >
          <div
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 outline-none"
            onPaste={handleModalPaste}
          >
            <DialogHeader>
              <DialogTitle>Thêm người tham gia — {matchName}</DialogTitle>
              <DialogDescription>
                Dán danh sách tên từ Excel hoặc nhập trực tiếp. Hệ thống tự tìm thành viên theo tên.
              </DialogDescription>
            </DialogHeader>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Dán từ Excel / Google Sheets</h3>
              <Textarea
                placeholder="Mỗi dòng một tên, hoặc dán cột tên từ Excel..."
                className="min-h-[88px] resize-y font-mono text-xs"
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text/plain");
                  if (!text || !isPasteableNameData(text)) return;
                  event.preventDefault();
                  handlePasteText(text, true);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePasteText(pasteText, true)}
                disabled={!pasteText.trim()}
              >
                Thêm từ ô dán
              </Button>
            </section>

            <section className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Danh sách tên</h3>
                <span className="text-xs text-muted-foreground">
                  {rows.length} dòng · {validNames.length} tên hợp lệ
                </span>
              </div>
              <div className="min-h-[220px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                          Chưa có tên nào. Dán danh sách hoặc thêm dòng mới.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, index) => (
                        <TableRow key={row.clientId}>
                          <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            <Input
                              value={row.name}
                              placeholder="Tên thành viên"
                              className="h-8"
                              onChange={(event) => {
                                const value = event.target.value;
                                setRows((prev) =>
                                  prev.map((item) =>
                                    item.clientId === row.clientId
                                      ? { ...item, name: value }
                                      : item,
                                  ),
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setRows((prev) =>
                                  prev.filter((item) => item.clientId !== row.clientId),
                                )
                              }
                              aria-label="Xóa dòng"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setRows((prev) => [...prev, createRow()])}>
                <Plus className="h-4 w-4" />
                Thêm dòng
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseRequest}>
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={validNames.length === 0 || addByNames.isPending}
                >
                  {addByNames.isPending ? "Đang thêm..." : "Thêm người tham gia"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>
              Danh sách tên chưa lưu sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục sửa</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              Hủy bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
