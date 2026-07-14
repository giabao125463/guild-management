"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { PasteImportPreview } from "@/lib/member-draft-types";
import {
  isTabularClipboardData,
  parseClipboardMembersDetailed,
} from "@/lib/parse-clipboard-members";
import { validateMemberDrafts } from "@/lib/member-draft-validation";
import { useBatchCreateMembers } from "@/hooks/use-api";
import { useMemberDraftTable } from "@/hooks/use-member-draft-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { MemberDraftTable } from "@/components/members/member-draft-table";
import { PastePreviewDialog } from "@/components/members/paste-preview-dialog";

interface AddMultipleMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PasteAreaForm {
  pasteText: string;
}

export function AddMultipleMembersModal({ open, onOpenChange }: AddMultipleMembersModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const batchCreate = useBatchCreateMembers();
  const {
    rows,
    errorsByClientId,
    isDirty,
    preparePastePreview,
    confirmPaste,
    updateRow,
    deleteRow,
    addEmptyRow,
    undo,
    redo,
    reset,
    clearHighlights,
    scrollTargetRef,
  } = useMemberDraftTable();

  const [pastePreview, setPastePreview] = React.useState<PasteImportPreview | null>(null);
  const [pastePreviewOpen, setPastePreviewOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [scrollTarget, setScrollTarget] = React.useState<string | null>(null);

  const { register, setValue, watch, reset: resetPasteForm } = useForm<PasteAreaForm>({
    defaultValues: { pasteText: "" },
  });

  const pasteText = watch("pasteText");

  React.useEffect(() => {
    if (!open) {
      reset();
      resetPasteForm({ pasteText: "" });
      setPastePreview(null);
      setPastePreviewOpen(false);
      setScrollTarget(null);
    }
  }, [open, reset, resetPasteForm]);

  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => modalRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    if (rows.some((row) => row.isHighlighted)) {
      const timer = window.setTimeout(() => clearHighlights(), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [rows, clearHighlights]);

  const handleCloseRequest = React.useCallback(() => {
    if (isDirty || rows.length > 0 || pasteText.trim()) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  }, [isDirty, onOpenChange, pasteText, rows.length]);

  const processClipboardText = React.useCallback(
    (text: string, clearTextarea: boolean) => {
      if (!isTabularClipboardData(text)) return false;

      const applyParsed = (parsed: ReturnType<typeof parseClipboardMembersDetailed>) => {
        if (parsed.drafts.length === 0 && parsed.invalidRows.length === 0) {
          toast.error("No importable rows found in clipboard");
          return;
        }

        const preview = preparePastePreview(parsed.drafts, parsed.invalidRows);
        setPastePreview({ ...preview, invalidRows: parsed.invalidRows });
        setPastePreviewOpen(true);

        if (clearTextarea) {
          setValue("pasteText", "", { shouldDirty: true });
        }
      };

      const lineCount = text.split(/\r\n|\r|\n/).length;
      if (lineCount > 500) {
        window.setTimeout(() => applyParsed(parseClipboardMembersDetailed(text)), 0);
      } else {
        applyParsed(parseClipboardMembersDetailed(text));
      }

      return true;
    },
    [preparePastePreview, setValue],
  );

  const handleModalPaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData("text/plain");
      if (!text || !isTabularClipboardData(text)) return;

      event.preventDefault();
      processClipboardText(text, true);
    },
    [processClipboardText],
  );

  const handleTextareaPaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = event.clipboardData.getData("text/plain");
      if (!text || !isTabularClipboardData(text)) return;

      event.preventDefault();
      processClipboardText(text, true);
    },
    [processClipboardText],
  );

  const handleConfirmPaste = React.useCallback(() => {
    if (!pastePreview) return;

    const { updatedCount } = confirmPaste(pastePreview.drafts);
    setPastePreviewOpen(false);
    setPastePreview(null);

    const importedCount = pastePreview.drafts.length;
    if (importedCount > 0) {
      toast.success(`${importedCount} members imported from clipboard.`);
    }
    if (updatedCount > 0) {
      toast.warning(`${updatedCount} duplicated member IDs were updated.`);
    }

    setScrollTarget(scrollTargetRef.current);
  }, [confirmPaste, pastePreview, scrollTargetRef]);

  const handleAddRow = React.useCallback(() => {
    const clientId = addEmptyRow();
    setScrollTarget(clientId);
  }, [addEmptyRow]);

  const handleSave = React.useCallback(async () => {
    const validation = validateMemberDrafts(rows);
    if (validation.validRows.length === 0) {
      toast.error("No valid rows to save");
      return;
    }

    try {
      const result = await batchCreate.mutateAsync(validation.validRows);
      if (result.failed.length > 0) {
        toast.warning(
          `Created ${result.created} members. ${result.failed.length} failed.`,
        );
      } else {
        toast.success(`Created ${result.created} members`);
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to create members");
    }
  }, [batchCreate, onOpenChange, rows]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseRequest();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        if (target.id === "paste-area") return;
        if (!isEditable || event.shiftKey) {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        if (target.id === "paste-area") return;
        event.preventDefault();
        redo();
      }
    },
    [handleCloseRequest, redo, undo],
  );

  const validation = React.useMemo(() => validateMemberDrafts(rows), [rows]);
  const canSave = validation.validRows.length > 0 && !batchCreate.isPending;
  const allRowsInvalid = rows.length > 0 && validation.validRows.length === 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) handleCloseRequest();
        }}
      >
        <DialogContent
          className="flex max-h-[92vh] max-w-5xl flex-col gap-4 overflow-hidden p-0 sm:rounded-lg"
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            handleCloseRequest();
          }}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 outline-none"
            onPaste={handleModalPaste}
            onKeyDown={handleKeyDown}
          >
            <DialogHeader>
              <DialogTitle>Add Multiple Members</DialogTitle>
              <DialogDescription>
                Paste from Excel / Google Sheets or edit rows directly. Press Ctrl+V anywhere in
                this dialog to import tabular data.
              </DialogDescription>
            </DialogHeader>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Paste From Excel / Google Sheets</h3>
              <Textarea
                id="paste-area"
                placeholder="Paste data directly from Excel or Google Sheets here..."
                className="min-h-[88px] resize-y font-mono text-xs"
                {...register("pasteText")}
                onPaste={handleTextareaPaste}
              />
            </section>

            <section className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Editable Member Table</h3>
                <span className="text-xs text-muted-foreground">
                  {rows.length} rows · {validation.validRows.length} valid
                </span>
              </div>
              <MemberDraftTable
                rows={rows}
                errorsByClientId={errorsByClientId}
                onUpdate={updateRow}
                onDelete={deleteRow}
                scrollToClientId={scrollTarget}
                onScrollComplete={() => setScrollTarget(null)}
              />
            </section>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={handleAddRow}>
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseRequest}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={!canSave || allRowsInvalid}>
                  {batchCreate.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <PastePreviewDialog
        open={pastePreviewOpen}
        preview={pastePreview}
        onConfirm={handleConfirmPaste}
        onCancel={() => {
          setPastePreviewOpen(false);
          setPastePreview(null);
        }}
      />

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved member rows. Closing will discard all changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
