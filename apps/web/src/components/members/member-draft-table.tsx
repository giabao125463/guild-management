"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  GAME_CLASSES,
  GAME_CLASS_LABELS,
  GameClass,
} from "@guild/shared-types";
import type { MemberDraftField, MemberDraftFieldErrors, TableMemberRow } from "@/lib/member-draft-types";
import { isRowValid } from "@/lib/member-draft-validation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROW_HEIGHT = 52;

export { ROW_HEIGHT };

interface MemberDraftTableRowProps {
  row: TableMemberRow;
  index: number;
  errors?: MemberDraftFieldErrors;
  onUpdate: (clientId: string, field: MemberDraftField, value: string) => void;
  onDelete: (clientId: string) => void;
  focusClientId?: string | null;
  onFocused?: () => void;
  rowRef?: (node: HTMLTableRowElement | null) => void;
}

export const MemberDraftTableRow = React.memo(function MemberDraftTableRow({
  row,
  index,
  errors,
  onUpdate,
  onDelete,
  focusClientId,
  onFocused,
  rowRef,
}: MemberDraftTableRowProps) {
  const idInputRef = React.useRef<HTMLInputElement>(null);
  const invalid = !isRowValid(errors);

  React.useEffect(() => {
    if (focusClientId === row.clientId) {
      idInputRef.current?.focus();
      onFocused?.();
    }
  }, [focusClientId, onFocused, row.clientId]);

  return (
    <tr
      ref={rowRef}
      data-client-id={row.clientId}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "border-b transition-colors",
        row.isHighlighted && "bg-amber-50 dark:bg-amber-950/30",
        invalid && "bg-destructive/5",
      )}
    >
      <td className="px-2 py-1 text-center text-xs text-muted-foreground">{index + 1}</td>
      <td className="px-2 py-1">
        <Input
          ref={idInputRef}
          value={row.internalMemberId}
          onChange={(event) => onUpdate(row.clientId, "internalMemberId", event.target.value)}
          className={cn("h-8 font-mono text-xs", errors?.internalMemberId && "border-destructive")}
          aria-invalid={Boolean(errors?.internalMemberId)}
        />
        {errors?.internalMemberId && (
          <p className="mt-0.5 text-[10px] text-destructive">{errors.internalMemberId}</p>
        )}
      </td>
      <td className="px-2 py-1">
        <Input
          value={row.currentName}
          onChange={(event) => onUpdate(row.clientId, "currentName", event.target.value)}
          className={cn("h-8 text-xs", errors?.currentName && "border-destructive")}
          aria-invalid={Boolean(errors?.currentName)}
        />
        {errors?.currentName && (
          <p className="mt-0.5 text-[10px] text-destructive">{errors.currentName}</p>
        )}
      </td>
      <td className="px-2 py-1">
        <Select
          value={row.currentClass || undefined}
          onValueChange={(value) => onUpdate(row.clientId, "currentClass", value as GameClass)}
        >
          <SelectTrigger
            className={cn("h-8 text-xs", errors?.currentClass && "border-destructive")}
          >
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {GAME_CLASSES.map((gameClass) => (
              <SelectItem key={gameClass} value={gameClass}>
                {GAME_CLASS_LABELS[gameClass]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.currentClass && (
          <p className="mt-0.5 text-[10px] text-destructive">{errors.currentClass}</p>
        )}
      </td>
      <td className="px-2 py-1">
        <DatePicker
          value={row.joinDate}
          onChange={(value) => onUpdate(row.clientId, "joinDate", value)}
          size="sm"
          clearable={false}
          placeholder="Chọn ngày"
          className={cn(errors?.joinDate && "border-destructive")}
          aria-invalid={Boolean(errors?.joinDate)}
        />
        {errors?.joinDate && (
          <p className="mt-0.5 text-[10px] text-destructive">{errors.joinDate}</p>
        )}
      </td>
      <td className="px-2 py-1 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(row.clientId)}
          aria-label="Delete row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
});

interface MemberDraftTableProps {
  rows: TableMemberRow[];
  errorsByClientId: Map<string, MemberDraftFieldErrors>;
  onUpdate: (clientId: string, field: MemberDraftField, value: string) => void;
  onDelete: (clientId: string) => void;
  scrollToClientId?: string | null;
  onScrollComplete?: () => void;
}

export function MemberDraftTable({
  rows,
  errorsByClientId,
  onUpdate,
  onDelete,
  scrollToClientId,
  onScrollComplete,
}: MemberDraftTableProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<Map<string, HTMLTableRowElement>>(new Map());
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(400);
  const [focusClientId, setFocusClientId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewportHeight(entry?.contentRect.height ?? 400);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!scrollToClientId) return;

    const rowIndex = rows.findIndex((row) => row.clientId === scrollToClientId);
    if (rowIndex >= 0) {
      containerRef.current?.scrollTo({
        top: rowIndex * ROW_HEIGHT,
        behavior: "smooth",
      });
      setFocusClientId(scrollToClientId);
    }

    const rowElement = rowRefs.current.get(scrollToClientId);
    rowElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    onScrollComplete?.();
  }, [scrollToClientId, rows, onScrollComplete]);

  const overscan = 8;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const endIndex = Math.min(
    rows.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + overscan,
  );

  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (rows.length - endIndex) * ROW_HEIGHT);
  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className="max-h-[min(420px,50vh)] overflow-auto rounded-md border"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <table className="w-full min-w-[760px] caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <tr className="border-b">
            <th className="h-10 w-12 px-2 text-left text-xs font-medium">No.</th>
            <th className="h-10 px-2 text-left text-xs font-medium">ID</th>
            <th className="h-10 px-2 text-left text-xs font-medium">Name</th>
            <th className="h-10 px-2 text-left text-xs font-medium">Class</th>
            <th className="h-10 px-2 text-left text-xs font-medium">Join Date</th>
            <th className="h-10 w-16 px-2 text-right text-xs font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                Paste from Excel or Google Sheets, or click Add Row.
              </td>
            </tr>
          ) : (
            <>
              {topSpacerHeight > 0 && (
                <tr aria-hidden style={{ height: topSpacerHeight }}>
                  <td colSpan={6} />
                </tr>
              )}
              {visibleRows.map((row, visibleIndex) => {
                const index = startIndex + visibleIndex;
                return (
                  <MemberDraftTableRow
                    key={row.clientId}
                    row={row}
                    index={index}
                    errors={errorsByClientId.get(row.clientId)}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    focusClientId={focusClientId}
                    onFocused={() => setFocusClientId(null)}
                    rowRef={(node) => {
                      if (node) rowRefs.current.set(row.clientId, node);
                      else rowRefs.current.delete(row.clientId);
                    }}
                  />
                );
              })}
              {bottomSpacerHeight > 0 && (
                <tr aria-hidden style={{ height: bottomSpacerHeight }}>
                  <td colSpan={6} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
