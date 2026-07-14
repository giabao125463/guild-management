import { format } from "date-fns";
import { parseGameClass } from "@guild/shared-utils";
import type {
  ClipboardParseResult,
  InvalidClipboardRow,
  MemberDraft,
} from "./member-draft-types";

export function todayIsoDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function normalizeClipboardText(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function isTabularClipboardData(text: string): boolean {
  try {
    const normalized = normalizeClipboardText(text);
    const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) return false;
    return lines.some((line) => line.includes("\t"));
  } catch {
    return false;
  }
}

function splitTabRow(line: string): string[] {
  const columns = line.split("\t").map((value) => value.trim());
  while (columns.length > 0 && columns[columns.length - 1] === "") {
    columns.pop();
  }
  return columns;
}

function isCompletelyEmptyRow(columns: string[]): boolean {
  return columns.every((value) => value.trim() === "");
}

export function parseClipboardMembers(input: string): MemberDraft[] {
  return parseClipboardMembersDetailed(input).drafts;
}

export function parseClipboardMembersDetailed(input: string): ClipboardParseResult {
  const drafts: MemberDraft[] = [];
  const invalidRows: InvalidClipboardRow[] = [];

  try {
    if (!input || typeof input !== "string") {
      return { drafts, invalidRows };
    }

    const lines = normalizeClipboardText(input).split("\n");

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const trimmedLine = line.trim();

      if (!trimmedLine) continue;

      const columns = splitTabRow(line);
      if (isCompletelyEmptyRow(columns)) continue;

      const internalMemberId = columns[0]?.trim() ?? "";
      const currentName = columns[1]?.trim() ?? "";
      const classRaw = columns[2]?.trim() ?? "";

      if (!internalMemberId) {
        invalidRows.push({
          lineNumber: index + 1,
          raw: trimmedLine,
          reason: "Missing member ID",
        });
        continue;
      }

      let currentClass: MemberDraft["currentClass"] = "";
      if (classRaw) {
        const parsedClass = parseGameClass(classRaw);
        if (!parsedClass) {
          invalidRows.push({
            lineNumber: index + 1,
            raw: trimmedLine,
            reason: `Invalid class: ${classRaw}`,
          });
          continue;
        }
        currentClass = parsedClass;
      }

      drafts.push({
        internalMemberId,
        currentName,
        currentClass,
        joinDate: todayIsoDate(),
      });
    }
  } catch {
    return { drafts: [], invalidRows: [] };
  }

  return { drafts, invalidRows };
}
