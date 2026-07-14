import { useCallback, useMemo, useReducer, useRef } from "react";
import type {
  InvalidClipboardRow,
  MemberDraft,
  MemberDraftField,
  MemberDraftFieldErrors,
  PasteImportPreview,
  TableMemberRow,
} from "@/lib/member-draft-types";
import {
  applyPasteImport,
  buildPasteImportPreview,
  createEmptyMemberRow,
} from "@/lib/merge-pasted-members";
import {
  findFirstInvalidClientId,
  validateMemberDrafts,
} from "@/lib/member-draft-validation";

const MAX_HISTORY = 50;

interface TableState {
  rows: TableMemberRow[];
  past: TableMemberRow[][];
  future: TableMemberRow[][];
}

type TableAction =
  | { type: "SET_ROWS"; rows: TableMemberRow[]; recordHistory?: boolean }
  | { type: "UPDATE_ROW"; clientId: string; field: MemberDraftField; value: string }
  | { type: "DELETE_ROW"; clientId: string }
  | { type: "ADD_ROW"; row: TableMemberRow }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_HIGHLIGHTS" }
  | { type: "RESET" };

function cloneRows(rows: TableMemberRow[]): TableMemberRow[] {
  return rows.map((row) => ({
    ...row,
    manuallyEdited: new Set(row.manuallyEdited),
  }));
}

function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case "SET_ROWS": {
      const nextRows = cloneRows(action.rows);
      if (!action.recordHistory) {
        return { ...state, rows: nextRows };
      }
      const past = [...state.past, cloneRows(state.rows)].slice(-MAX_HISTORY);
      return { rows: nextRows, past, future: [] };
    }
    case "UPDATE_ROW": {
      const past = [...state.past, cloneRows(state.rows)].slice(-MAX_HISTORY);
      const rows = state.rows.map((row) => {
        if (row.clientId !== action.clientId) return row;
        const manuallyEdited = new Set(row.manuallyEdited);
        manuallyEdited.add(action.field);
        return {
          ...row,
          [action.field]: action.value,
          manuallyEdited,
        };
      });
      return { rows, past, future: [] };
    }
    case "DELETE_ROW": {
      const past = [...state.past, cloneRows(state.rows)].slice(-MAX_HISTORY);
      return {
        rows: state.rows.filter((row) => row.clientId !== action.clientId),
        past,
        future: [],
      };
    }
    case "ADD_ROW": {
      const past = [...state.past, cloneRows(state.rows)].slice(-MAX_HISTORY);
      return {
        rows: [...state.rows, action.row],
        past,
        future: [],
      };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      return {
        rows: cloneRows(previous),
        past: state.past.slice(0, -1),
        future: [cloneRows(state.rows), ...state.future].slice(0, MAX_HISTORY),
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0]!;
      return {
        rows: cloneRows(next),
        past: [...state.past, cloneRows(state.rows)].slice(-MAX_HISTORY),
        future: state.future.slice(1),
      };
    }
    case "CLEAR_HIGHLIGHTS": {
      return {
        ...state,
        rows: state.rows.map((row) => ({ ...row, isHighlighted: false })),
      };
    }
    case "RESET": {
      return { rows: [], past: [], future: [] };
    }
    default:
      return state;
  }
}

export interface UseMemberDraftTableResult {
  rows: TableMemberRow[];
  errorsByClientId: Map<string, MemberDraftFieldErrors>;
  validRowsCount: number;
  hasDuplicateIds: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  preparePastePreview: (
    drafts: MemberDraft[],
    invalidRows: InvalidClipboardRow[],
  ) => PasteImportPreview;
  confirmPaste: (drafts: MemberDraft[]) => {
    firstNewClientId: string | null;
    firstInvalidClientId: string | null;
    updatedCount: number;
  };
  updateRow: (clientId: string, field: MemberDraftField, value: string) => void;
  deleteRow: (clientId: string) => void;
  addEmptyRow: () => string;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  clearHighlights: () => void;
  scrollTargetRef: React.MutableRefObject<string | null>;
}

export function useMemberDraftTable(): UseMemberDraftTableResult {
  const [state, dispatch] = useReducer(tableReducer, {
    rows: [],
    past: [],
    future: [],
  });
  const scrollTargetRef = useRef<string | null>(null);
  const validation = useMemo(
    () => validateMemberDrafts(state.rows),
    [state.rows],
  );

  const isDirty = state.rows.length > 0 || state.past.length > 0;

  const preparePastePreview = useCallback(
    (drafts: MemberDraft[], invalidRows: InvalidClipboardRow[]): PasteImportPreview => ({
      ...buildPasteImportPreview(state.rows, drafts, invalidRows.length),
      invalidRows,
    }),
    [state.rows],
  );

  const confirmPaste = useCallback(
    (drafts: MemberDraft[]) => {
      const { rows, firstNewClientId, updatedCount } = applyPasteImport(state.rows, drafts);
      dispatch({ type: "SET_ROWS", rows, recordHistory: true });
      scrollTargetRef.current = firstNewClientId;

      const nextValidation = validateMemberDrafts(rows);
      const firstInvalidClientId = findFirstInvalidClientId(
        rows,
        nextValidation.errorsByClientId,
      );
      if (firstInvalidClientId) {
        scrollTargetRef.current = firstInvalidClientId;
      }

      return { firstNewClientId, firstInvalidClientId, updatedCount };
    },
    [state.rows],
  );

  const updateRow = useCallback(
    (clientId: string, field: MemberDraftField, value: string) => {
      dispatch({ type: "UPDATE_ROW", clientId, field, value });
    },
    [],
  );

  const deleteRow = useCallback((clientId: string) => {
    dispatch({ type: "DELETE_ROW", clientId });
  }, []);

  const addEmptyRow = useCallback(() => {
    const row = createEmptyMemberRow();
    dispatch({ type: "ADD_ROW", row });
    scrollTargetRef.current = row.clientId;
    return row.clientId;
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);
  const clearHighlights = useCallback(() => dispatch({ type: "CLEAR_HIGHLIGHTS" }), []);

  return {
    rows: state.rows,
    errorsByClientId: validation.errorsByClientId,
    validRowsCount: validation.validRows.length,
    hasDuplicateIds: validation.hasDuplicateIds,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
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
  };
}