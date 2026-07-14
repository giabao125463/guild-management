import type { GameClass } from "@guild/shared-types";

export interface MemberDraft {
  internalMemberId: string;
  currentName: string;
  currentClass: GameClass | "";
  joinDate: string;
}

export type MemberDraftField = keyof MemberDraft;

export interface TableMemberRow extends MemberDraft {
  clientId: string;
  manuallyEdited: Set<MemberDraftField>;
  isHighlighted: boolean;
}

export interface InvalidClipboardRow {
  lineNumber: number;
  raw: string;
  reason: string;
}

export interface ClipboardParseResult {
  drafts: MemberDraft[];
  invalidRows: InvalidClipboardRow[];
}

export interface PasteImportSummary {
  importedRows: number;
  newMembers: number;
  updatedMembers: number;
  invalidRows: number;
}

export interface PasteImportPreview {
  summary: PasteImportSummary;
  drafts: MemberDraft[];
  invalidRows: InvalidClipboardRow[];
  newRowClientIds: string[];
  updatedRowClientIds: string[];
}

export interface MemberDraftFieldErrors {
  internalMemberId?: string;
  currentName?: string;
  currentClass?: string;
  joinDate?: string;
}

export interface ValidatedMemberDraft extends MemberDraft {
  currentClass: GameClass;
}
