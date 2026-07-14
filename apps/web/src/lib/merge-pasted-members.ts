import type { MemberDraft, MemberDraftField, PasteImportPreview, TableMemberRow } from "./member-draft-types";
import { todayIsoDate } from "./parse-clipboard-members";

export function createEmptyMemberRow(): TableMemberRow {
  return {
    clientId: crypto.randomUUID(),
    internalMemberId: "",
    currentName: "",
    currentClass: "",
    joinDate: todayIsoDate(),
    manuallyEdited: new Set(),
    isHighlighted: false,
  };
}

export function memberDraftToRow(draft: MemberDraft): TableMemberRow {
  return {
    clientId: crypto.randomUUID(),
    internalMemberId: draft.internalMemberId,
    currentName: draft.currentName,
    currentClass: draft.currentClass,
    joinDate: draft.joinDate || todayIsoDate(),
    manuallyEdited: new Set(),
    isHighlighted: false,
  };
}

function mergeField<K extends MemberDraftField>(
  existing: TableMemberRow,
  pasted: MemberDraft,
  field: K,
): MemberDraft[K] {
  const pastedValue = pasted[field];
  const hasPastedValue =
    pastedValue !== "" && pastedValue !== null && pastedValue !== undefined;

  if (hasPastedValue) return pastedValue;
  if (existing.manuallyEdited.has(field)) return existing[field];
  return pastedValue;
}

export function mergePastedRow(existing: TableMemberRow, pasted: MemberDraft): TableMemberRow {
  return {
    ...existing,
    internalMemberId: pasted.internalMemberId.trim(),
    currentName: mergeField(existing, pasted, "currentName"),
    currentClass: mergeField(existing, pasted, "currentClass"),
    joinDate: mergeField(existing, pasted, "joinDate"),
    isHighlighted: true,
  };
}

export function buildPasteImportPreview(
  existingRows: TableMemberRow[],
  drafts: MemberDraft[],
  invalidRowCount: number,
): PasteImportPreview {
  const rowById = new Map<string, TableMemberRow>();
  for (const row of existingRows) {
    const id = row.internalMemberId.trim().toLowerCase();
    if (id) rowById.set(id, row);
  }

  const newRowClientIds: string[] = [];
  const updatedRowClientIds: string[] = [];

  for (const draft of drafts) {
    const normalizedId = draft.internalMemberId.trim().toLowerCase();
    const existing = rowById.get(normalizedId);
    if (existing) {
      updatedRowClientIds.push(existing.clientId);
    } else {
      newRowClientIds.push(`pending:${normalizedId}`);
    }
  }

  return {
    summary: {
      importedRows: drafts.length + invalidRowCount,
      newMembers: newRowClientIds.filter((id) => id.startsWith("pending:")).length,
      updatedMembers: updatedRowClientIds.length,
      invalidRows: invalidRowCount,
    },
    drafts,
    invalidRows: [],
    newRowClientIds,
    updatedRowClientIds,
  };
}

export function applyPasteImport(
  existingRows: TableMemberRow[],
  drafts: MemberDraft[],
): { rows: TableMemberRow[]; firstNewClientId: string | null; updatedCount: number } {
  const rows = existingRows.map((row) => ({ ...row, isHighlighted: false }));
  const rowById = new Map<string, number>();

  for (let index = 0; index < rows.length; index += 1) {
    const id = rows[index]?.internalMemberId.trim().toLowerCase();
    if (id) rowById.set(id, index);
  }

  let firstNewClientId: string | null = null;
  let updatedCount = 0;

  for (const draft of drafts) {
    const normalizedId = draft.internalMemberId.trim().toLowerCase();
    const existingIndex = rowById.get(normalizedId);

    if (existingIndex !== undefined) {
      rows[existingIndex] = mergePastedRow(rows[existingIndex]!, draft);
      updatedCount += 1;
      continue;
    }

    const newRow = memberDraftToRow(draft);
    rows.push(newRow);
    rowById.set(normalizedId, rows.length - 1);
    if (!firstNewClientId) firstNewClientId = newRow.clientId;
  }

  return { rows, firstNewClientId, updatedCount };
}
