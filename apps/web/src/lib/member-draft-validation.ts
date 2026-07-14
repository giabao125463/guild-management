import { z } from "zod";
import { GameClass } from "@guild/shared-types";
import type {
  MemberDraftFieldErrors,
  TableMemberRow,
  ValidatedMemberDraft,
} from "./member-draft-types";

const memberDraftSchema = z.object({
  internalMemberId: z.string().min(1, "ID is required"),
  currentName: z.string().min(1, "Name is required"),
  currentClass: z.nativeEnum(GameClass, { required_error: "Class is required" }),
  joinDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Join date must be yyyy-MM-dd"),
});

export function validateMemberDraft(row: TableMemberRow): MemberDraftFieldErrors {
  const result = memberDraftSchema.safeParse(row);
  if (result.success) return {};

  const errors: MemberDraftFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      field === "internalMemberId" ||
      field === "currentName" ||
      field === "currentClass" ||
      field === "joinDate"
    ) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export function validateMemberDrafts(rows: TableMemberRow[]): {
  errorsByClientId: Map<string, MemberDraftFieldErrors>;
  validRows: ValidatedMemberDraft[];
  hasDuplicateIds: boolean;
} {
  const errorsByClientId = new Map<string, MemberDraftFieldErrors>();
  const validRows: ValidatedMemberDraft[] = [];
  const idCounts = new Map<string, number>();

  for (const row of rows) {
    const normalizedId = row.internalMemberId.trim().toLowerCase();
    if (normalizedId) {
      idCounts.set(normalizedId, (idCounts.get(normalizedId) ?? 0) + 1);
    }
  }

  const duplicateIds = new Set(
    [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );
  const hasDuplicateIds = duplicateIds.size > 0;

  for (const row of rows) {
    const fieldErrors = validateMemberDraft(row);
    const normalizedId = row.internalMemberId.trim().toLowerCase();

    if (normalizedId && duplicateIds.has(normalizedId)) {
      fieldErrors.internalMemberId = "Duplicate ID in table";
    }

    if (Object.keys(fieldErrors).length > 0) {
      errorsByClientId.set(row.clientId, fieldErrors);
      continue;
    }

    validRows.push({
      internalMemberId: row.internalMemberId.trim(),
      currentName: row.currentName.trim(),
      currentClass: row.currentClass as GameClass,
      joinDate: row.joinDate,
    });
  }

  return { errorsByClientId, validRows, hasDuplicateIds };
}

export function isRowValid(errors: MemberDraftFieldErrors | undefined): boolean {
  return !errors || Object.keys(errors).length === 0;
}

export function findFirstInvalidClientId(
  rows: TableMemberRow[],
  errorsByClientId: Map<string, MemberDraftFieldErrors>,
): string | null {
  for (const row of rows) {
    if (!isRowValid(errorsByClientId.get(row.clientId))) {
      return row.clientId;
    }
  }
  return null;
}
