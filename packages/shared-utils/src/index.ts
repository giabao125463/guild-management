import {
  GameClass,
  GAME_CLASS_LABELS,
  PaginationMeta,
  Permission,
} from '@guild/shared-types';

export function getGameClassLabel(gameClass: GameClass): string {
  return GAME_CLASS_LABELS[gameClass] ?? gameClass;
}

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeClassToken(value: string): string {
  return removeDiacritics(value.trim().toLowerCase()).replace(/\s+/g, ' ');
}

const GAME_CLASS_SHORT_CODES: Record<string, GameClass> = {
  tv: GameClass.TO_VAN,
  ty: GameClass.THIET_Y,
  hh: GameClass.HUYET_HA,
  tt: GameClass.THAN_TUONG,
  cl: GameClass.CUU_LINH,
  tm: GameClass.TOAI_MONG,
  ln: GameClass.LONG_NGAM,
};

const GAME_CLASS_PARTIAL_ALIASES: Record<string, GameClass> = {
  to: GameClass.TO_VAN,
  'to van': GameClass.TO_VAN,
  'tố vấn': GameClass.TO_VAN,
  thiet: GameClass.THIET_Y,
  'thiet y': GameClass.THIET_Y,
  'thiết y': GameClass.THIET_Y,
  hh: GameClass.HUYET_HA,
  'huyet ha': GameClass.HUYET_HA,
  'huyết hà': GameClass.HUYET_HA,
  tt: GameClass.THAN_TUONG,
  'than tuong': GameClass.THAN_TUONG,
  'thần tương': GameClass.THAN_TUONG,
  cl: GameClass.CUU_LINH,
  'cuu linh': GameClass.CUU_LINH,
  'cửu linh': GameClass.CUU_LINH,
  tm: GameClass.TOAI_MONG,
  'toai mong': GameClass.TOAI_MONG,
  'toái mộng': GameClass.TOAI_MONG,
  ln: GameClass.LONG_NGAM,
  'long ngam': GameClass.LONG_NGAM,
  'long ngâm': GameClass.LONG_NGAM,
};

function buildGameClassLookup(): Map<string, GameClass> {
  const lookup = new Map<string, GameClass>();

  for (const gameClass of Object.values(GameClass)) {
    lookup.set(normalizeClassToken(gameClass), gameClass);
    lookup.set(normalizeClassToken(gameClass.replace(/_/g, ' ')), gameClass);
  }

  for (const [gameClass, label] of Object.entries(GAME_CLASS_LABELS)) {
    lookup.set(normalizeClassToken(label), gameClass as GameClass);
    lookup.set(normalizeClassToken(removeDiacritics(label)), gameClass as GameClass);
  }

  for (const [alias, gameClass] of Object.entries(GAME_CLASS_SHORT_CODES)) {
    lookup.set(normalizeClassToken(alias), gameClass);
  }

  for (const [alias, gameClass] of Object.entries(GAME_CLASS_PARTIAL_ALIASES)) {
    lookup.set(normalizeClassToken(alias), gameClass);
    lookup.set(normalizeClassToken(removeDiacritics(alias)), gameClass);
  }

  return lookup;
}

const GAME_CLASS_LOOKUP = buildGameClassLookup();

export function parseGameClass(value: string): GameClass | null {
  if (!value?.trim()) return null;

  const normalized = normalizeClassToken(value);
  const direct = GAME_CLASS_LOOKUP.get(normalized);
  if (direct) return direct;

  const byKey = Object.values(GameClass).find(
    (gameClass) => gameClass === value.trim().toUpperCase().replace(/\s+/g, '_'),
  );
  if (byKey) return byKey;

  const entry = Object.entries(GAME_CLASS_LABELS).find(
    ([, label]) => label.toLowerCase() === value.trim().toLowerCase(),
  );
  return entry ? (entry[0] as GameClass) : null;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function clampPagination(page?: number, limit?: number): { page: number; limit: number; skip: number } {
  const safePage = Math.max(1, page ?? 1);
  const safeLimit = Math.min(100, Math.max(1, limit ?? 20));
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function hasPermission(
  userPermissions: Permission[] | string[],
  required: Permission | Permission[],
): boolean {
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((p) => userPermissions.includes(p));
}

export function hasAnyPermission(
  userPermissions: Permission[] | string[],
  required: Permission[],
): boolean {
  return required.some((p) => userPermissions.includes(p));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function parseTags(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((t) => t.trim()).filter(Boolean);
  }
  return value
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

export function nextSaturday(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + (day === 6 ? 0 : diff));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function upcomingSaturdays(count: number, from: Date = new Date()): Date[] {
  const dates: Date[] = [];
  let sat = nextSaturday(from);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(sat));
    sat = new Date(sat);
    sat.setDate(sat.getDate() + 7);
  }
  return dates;
}

export function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

/** Cryptographically stronger random index for giveaway spins */
export function secureRandomIndex(length: number): number {
  if (length <= 0) return -1;
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0]! % length;
  }
  return Math.floor(Math.random() * length);
}

export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
