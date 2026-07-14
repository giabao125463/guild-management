import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { GameClass } from '@prisma/client';
import {
  GAME_CLASS_LABELS,
  ImportResult,
  MemberDto,
} from '@guild/shared-types';
import { parseGameClass, parseTags } from '@guild/shared-utils';

export const MEMBER_EXCEL_COLUMNS = [
  'internalMemberId',
  'currentName',
  'currentClass',
  'joinDate',
  'kimLang',
  'relationship',
  'realLifeRelationship',
  'tags',
  'note',
  'contributionPoint',
  'isActive',
  'isBlacklisted',
] as const;

export interface MemberExcelRow {
  row: number;
  internalMemberId: string;
  currentName: string;
  currentClass: GameClass;
  joinDate: Date | null;
  kimLang: string | null;
  relationship: string | null;
  realLifeRelationship: string | null;
  tags: string[];
  note: string | null;
  contributionPoint: number;
  isActive: boolean;
  isBlacklisted: boolean;
}

export interface MemberImportPreview {
  valid: MemberExcelRow[];
  errors: { row: number; message: string }[];
  summary: { total: number; valid: number; invalid: number };
}

@Injectable()
export class ExcelService {
  async buildMemberTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Members');

    sheet.columns = MEMBER_EXCEL_COLUMNS.map((key) => ({
      header: key,
      key,
      width: key === 'note' ? 40 : 18,
    }));

    sheet.addRow({
      internalMemberId: 'M001',
      currentName: 'Example Member',
      currentClass: GAME_CLASS_LABELS[GameClass.LONG_NGAM],
      joinDate: '2024-01-15',
      kimLang: '',
      relationship: '',
      realLifeRelationship: '',
      tags: 'core,pvp',
      note: '',
      contributionPoint: 0,
      isActive: true,
      isBlacklisted: false,
    });

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportMembers(members: MemberDto[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Members');

    sheet.columns = MEMBER_EXCEL_COLUMNS.map((key) => ({
      header: key,
      key,
      width: key === 'note' ? 40 : 18,
    }));

    for (const member of members) {
      sheet.addRow({
        internalMemberId: member.internalMemberId,
        currentName: member.currentName,
        currentClass: GAME_CLASS_LABELS[member.currentClass],
        joinDate: member.joinDate ? member.joinDate.slice(0, 10) : '',
        kimLang: member.kimLangUserGroup?.name ?? '',
        relationship: member.relationship ?? '',
        realLifeRelationship: member.realLifeRelationship ?? '',
        tags: member.tags.join(','),
        note: member.note ?? '',
        contributionPoint: member.contributionPoint,
        isActive: member.isActive,
        isBlacklisted: member.isBlacklisted,
      });
    }

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async parseMemberImport(
    buffer: Buffer,
    previewOnly = false,
  ): Promise<{
    preview: MemberImportPreview;
    result?: ImportResult;
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const headerRow = sheet.getRow(1);
    const columnMap = this.buildColumnMap(headerRow);

    const valid: MemberExcelRow[] = [];
    const errors: { row: number; message: string }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const parsed = this.parseMemberRow(row, rowNumber, columnMap);
      if ('error' in parsed) {
        errors.push({ row: rowNumber, message: parsed.error });
      } else {
        valid.push(parsed);
      }
    });

    const preview: MemberImportPreview = {
      valid,
      errors,
      summary: {
        total: valid.length + errors.length,
        valid: valid.length,
        invalid: errors.length,
      },
    };

    if (previewOnly) {
      return { preview };
    }

    return {
      preview,
      result: {
        inserted: 0,
        updated: 0,
        failed: errors.length,
        errors,
      },
    };
  }

  async parseGuildWarParticipants(buffer: Buffer): Promise<{
    names: string[];
    internalMemberIds: string[];
    errors: { row: number; message: string }[];
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const headerRow = sheet.getRow(1);
    const columnMap = this.buildColumnMap(headerRow);

    const nameCol =
      columnMap.get('name') ??
      columnMap.get('currentname') ??
      columnMap.get('ten') ??
      columnMap.get('tên');

    const idCol =
      columnMap.get('internalmemberid') ??
      columnMap.get('internal_member_id') ??
      columnMap.get('memberid');

    if (!nameCol && !idCol) {
      throw new BadRequestException(
        'Excel must contain a name or internalMemberId column',
      );
    }

    const names: string[] = [];
    const internalMemberIds: string[] = [];
    const errors: { row: number; message: string }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      if (nameCol) {
        const rawName = this.cellValue(row.getCell(nameCol));
        if (!rawName) {
          errors.push({
            row: rowNumber,
            message: 'name is required',
          });
          return;
        }
        names.push(String(rawName).trim());
        return;
      }

      const raw = this.cellValue(row.getCell(idCol!));
      if (!raw) {
        errors.push({
          row: rowNumber,
          message: 'internalMemberId is required',
        });
        return;
      }
      internalMemberIds.push(String(raw).trim());
    });

    return { names, internalMemberIds, errors };
  }

  async buildGuildWarParticipantTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Participants');

    sheet.columns = [{ header: 'name', key: 'name', width: 28 }];
    sheet.addRow({ name: 'Nguyễn Văn A' });

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildColumnMap(headerRow: ExcelJS.Row): Map<string, number> {
    const map = new Map<string, number>();
    headerRow.eachCell((cell, colNumber) => {
      const header = String(this.cellValue(cell) ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
      if (header) map.set(header, colNumber);
    });
    return map;
  }

  private parseMemberRow(
    row: ExcelJS.Row,
    rowNumber: number,
    columnMap: Map<string, number>,
  ): MemberExcelRow | { error: string } {
    const get = (name: string): unknown => {
      const col = columnMap.get(name.toLowerCase());
      if (!col) return undefined;
      return this.cellValue(row.getCell(col));
    };

    const internalMemberId = String(get('internalmemberid') ?? '').trim();
    const currentName = String(get('currentname') ?? '').trim();
    const classRaw = String(get('currentclass') ?? '').trim();

    if (!internalMemberId) {
      return { error: 'internalMemberId is required' };
    }
    if (!currentName) {
      return { error: 'currentName is required' };
    }
    if (!classRaw) {
      return { error: 'currentClass is required' };
    }

    const currentClass = parseGameClass(classRaw);
    if (!currentClass) {
      return { error: `Invalid currentClass: ${classRaw}` };
    }

    const joinDateRaw = get('joindate');
    let joinDate: Date | null = null;
    if (joinDateRaw) {
      if (joinDateRaw instanceof Date) {
        joinDate = joinDateRaw;
      } else {
        const parsed = new Date(String(joinDateRaw));
        if (Number.isNaN(parsed.getTime())) {
          return { error: `Invalid joinDate: ${joinDateRaw}` };
        }
        joinDate = parsed;
      }
    }

    const contributionRaw = get('contributionpoint');
    const contributionPoint =
      contributionRaw === undefined || contributionRaw === ''
        ? 0
        : Number(contributionRaw);
    if (Number.isNaN(contributionPoint) || contributionPoint < 0) {
      return { error: 'contributionPoint must be a non-negative number' };
    }

    return {
      row: rowNumber,
      internalMemberId,
      currentName,
      currentClass,
      joinDate,
      kimLang: this.optionalString(get('kimlang')),
      relationship: this.optionalString(get('relationship')),
      realLifeRelationship: this.optionalString(get('realliferelationship')),
      tags: parseTags(get('tags') as string | undefined),
      note: this.optionalString(get('note')),
      contributionPoint,
      isActive: this.parseBoolean(get('isactive'), true),
      isBlacklisted: this.parseBoolean(get('isblacklisted'), false),
    };
  }

  private cellValue(cell: ExcelJS.Cell): unknown {
    const value = cell.value;
    if (value && typeof value === 'object' && 'result' in value) {
      return (value as ExcelJS.CellFormulaValue).result;
    }
    if (value && typeof value === 'object' && 'text' in value) {
      return (value as { text: string }).text;
    }
    if (value && typeof value === 'object' && 'richText' in value) {
      const richText = (value as ExcelJS.CellRichTextValue).richText;
      return richText.map((part) => part.text).join('');
    }
    return value;
  }

  private optionalString(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    return String(value).trim();
  }

  private parseBoolean(value: unknown, defaultValue: boolean): boolean {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    if (typeof value === 'boolean') return value;
    const str = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(str)) return true;
    if (['false', '0', 'no', 'n'].includes(str)) return false;
    return defaultValue;
  }
}
