import {
  buildPaginationMeta,
  clampPagination,
  parseGameClass,
  hasPermission,
} from '@guild/shared-utils';
import { GameClass, Permission } from '@guild/shared-types';

describe('shared-utils', () => {
  it('clamps pagination', () => {
    expect(clampPagination(0, 0)).toEqual({ page: 1, limit: 1, skip: 0 });
    expect(clampPagination(2, 50)).toEqual({ page: 2, limit: 50, skip: 50 });
    expect(clampPagination(1, 999).limit).toBe(100);
  });

  it('builds pagination meta', () => {
    expect(buildPaginationMeta(1, 20, 45)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('parses game class labels', () => {
    expect(parseGameClass('Long Ngâm')).toBe(GameClass.LONG_NGAM);
    expect(parseGameClass('TO_VAN')).toBe(GameClass.TO_VAN);
    expect(parseGameClass('unknown')).toBeNull();
  });

  it('checks permissions', () => {
    expect(
      hasPermission([Permission.MEMBER_READ], Permission.MEMBER_READ),
    ).toBe(true);
    expect(
      hasPermission([Permission.MEMBER_READ], Permission.MEMBER_WRITE),
    ).toBe(false);
  });
});
