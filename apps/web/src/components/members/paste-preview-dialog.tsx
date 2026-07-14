"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { InvalidClipboardRow, PasteImportPreview } from "@/lib/member-draft-types";
import { Button } from "@/components/ui/button";
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

interface PastePreviewDialogProps {
  open: boolean;
  preview: PasteImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PastePreviewDialog({
  open,
  preview,
  onConfirm,
  onCancel,
}: PastePreviewDialogProps) {
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  if (!preview) return null;

  const { summary, invalidRows } = preview;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm paste import</DialogTitle>
          <DialogDescription>
            Review the summary before adding rows to the table.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 text-sm">
          <SummaryRow label="Imported rows" value={summary.importedRows} />
          <SummaryRow label="New members" value={summary.newMembers} />
          <SummaryRow label="Updated existing rows" value={summary.updatedMembers} />
          <SummaryRow
            label="Invalid rows"
            value={summary.invalidRows}
            tone={summary.invalidRows > 0 ? "destructive" : "default"}
          />
        </div>

        {invalidRows.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-destructive"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Inspect invalid rows ({invalidRows.length})
            </button>
            {expanded && <InvalidRowsTable rows={invalidRows} />}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "destructive" ? "font-semibold text-destructive" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}

function InvalidRowsTable({ rows }: { rows: InvalidClipboardRow[] }) {
  return (
    <div className="max-h-48 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Line</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.lineNumber}-${row.raw}`}>
              <TableCell>{row.lineNumber}</TableCell>
              <TableCell className="max-w-[160px] truncate font-mono text-xs">{row.raw}</TableCell>
              <TableCell className="text-destructive">{row.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
