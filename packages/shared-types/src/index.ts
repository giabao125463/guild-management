/** Game classes for Justice Online (Nghịch Thủy Hàn) */
export enum GameClass {
  TO_VAN = 'TO_VAN',
  THIET_Y = 'THIET_Y',
  HUYET_HA = 'HUYET_HA',
  THAN_TUONG = 'THAN_TUONG',
  CUU_LINH = 'CUU_LINH',
  TOAI_MONG = 'TOAI_MONG',
  LONG_NGAM = 'LONG_NGAM',
}

export const GAME_CLASS_LABELS: Record<GameClass, string> = {
  [GameClass.TO_VAN]: 'Tố Vấn',
  [GameClass.THIET_Y]: 'Thiết Y',
  [GameClass.HUYET_HA]: 'Huyết Hà',
  [GameClass.THAN_TUONG]: 'Thần Tương',
  [GameClass.CUU_LINH]: 'Cửu Linh',
  [GameClass.TOAI_MONG]: 'Toái Mộng',
  [GameClass.LONG_NGAM]: 'Long Ngâm',
};

export const GAME_CLASSES = Object.values(GameClass);

/** System permissions by module */
export enum Permission {
  MEMBER_READ = 'member.read',
  MEMBER_WRITE = 'member.write',
  MEMBER_DELETE = 'member.delete',
  MEMBER_IMPORT = 'member.import',
  GUILDWAR_READ = 'guildwar.read',
  GUILDWAR_WRITE = 'guildwar.write',
  GUILDWAR_DELETE = 'guildwar.delete',
  GUILDWAR_IMPORT = 'guildwar.import',
  DUNGEON_READ = 'dungeon.read',
  DUNGEON_WRITE = 'dungeon.write',
  DUNGEON_DELETE = 'dungeon.delete',
  REPORT_READ = 'report.read',
  USER_READ = 'user.read',
  USER_WRITE = 'user.write',
  USER_DELETE = 'user.delete',
  AUDIT_READ = 'audit.read',
  GIVEAWAY_READ = 'giveaway.read',
  GIVEAWAY_WRITE = 'giveaway.write',
  USER_GROUP_READ = 'user_group.read',
  USER_GROUP_WRITE = 'user_group.write',
  USER_GROUP_DELETE = 'user_group.delete',
}

export const ALL_PERMISSIONS = Object.values(Permission);

export const PERMISSION_GROUPS = {
  member: [
    Permission.MEMBER_READ,
    Permission.MEMBER_WRITE,
    Permission.MEMBER_DELETE,
    Permission.MEMBER_IMPORT,
  ],
  guildwar: [
    Permission.GUILDWAR_READ,
    Permission.GUILDWAR_WRITE,
    Permission.GUILDWAR_DELETE,
    Permission.GUILDWAR_IMPORT,
  ],
  dungeon: [
    Permission.DUNGEON_READ,
    Permission.DUNGEON_WRITE,
    Permission.DUNGEON_DELETE,
  ],
  report: [Permission.REPORT_READ],
  user: [Permission.USER_READ, Permission.USER_WRITE, Permission.USER_DELETE],
  audit: [Permission.AUDIT_READ],
  giveaway: [Permission.GIVEAWAY_READ, Permission.GIVEAWAY_WRITE],
  userGroup: [
    Permission.USER_GROUP_READ,
    Permission.USER_GROUP_WRITE,
    Permission.USER_GROUP_DELETE,
  ],
} as const;

export enum MemberTimelineEventType {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  REJOINED = 'REJOINED',
  NAME_CHANGED = 'NAME_CHANGED',
  CLASS_CHANGED = 'CLASS_CHANGED',
  BLACKLISTED = 'BLACKLISTED',
  UNBLACKLISTED = 'UNBLACKLISTED',
  CONTRIBUTION_UPDATED = 'CONTRIBUTION_UPDATED',
  NOTE_UPDATED = 'NOTE_UPDATED',
}

export enum DungeonStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum GiveawayFilterType {
  ALL_MATCHES_TODAY = 'ALL_MATCHES_TODAY',
  MVP_TODAY = 'MVP_TODAY',
  CUSTOM = 'CUSTOM',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  RESET_PASSWORD = 'RESET_PASSWORD',
  SPIN_GIVEAWAY = 'SPIN_GIVEAWAY',
  REGISTER = 'REGISTER',
  CANCEL_REGISTRATION = 'CANCEL_REGISTRATION',
}

export enum UserGroupType {
  KIM_LANG = 'KIM_LANG',
  TEAM = 'TEAM',
  TINH_DUYEN = 'TINH_DUYEN',
}

export const USER_GROUP_TYPE_LABELS: Record<UserGroupType, string> = {
  [UserGroupType.KIM_LANG]: 'Kim Lang',
  [UserGroupType.TEAM]: 'Team',
  [UserGroupType.TINH_DUYEN]: 'Tình duyên',
};

export const USER_GROUP_TYPES = Object.values(UserGroupType);

export interface MemberUserGroupRef {
  id: string;
  name: string;
  type: UserGroupType;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  permissions: Permission[];
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface UserGroupDto {
  id: string;
  name: string;
  type: UserGroupType;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MemberDto {
  id: string;
  internalMemberId: string;
  currentName: string;
  currentClass: GameClass;
  joinDate: string | null;
  leaveDate: string | null;
  isActive: boolean;
  isBlacklisted: boolean;
  relationship: string | null;
  realLifeRelationship: string | null;
  tags: string[];
  note: string | null;
  contributionPoint: number;
  guildWarAttendanceCount: number;
  userGroups: Partial<Record<UserGroupType, MemberUserGroupRef>>;
  kimLangUserGroup: MemberUserGroupRef | null;
  historicalNames: string[];
  historicalClasses: GameClass[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MemberTimelineDto {
  id: string;
  memberId: string;
  eventType: MemberTimelineEventType;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface GuildWarDayDto {
  id: string;
  date: string;
  note: string | null;
  autoCreated: boolean;
  matchCount: number;
  matches?: GuildWarMatchDto[];
  createdAt: string;
  updatedAt: string;
}

export interface GuildWarAutoSyncResult {
  created: number;
  skipped: number;
  dates: string[];
}

export interface GuildWarMatchDto {
  id: string;
  guildWarDayId: string;
  name: string;
  order: number;
  mvpMemberId: string | null;
  mvpMember?: { id: string; internalMemberId: string; currentName: string } | null;
  participantCount: number;
  participants?: GuildWarParticipantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface GuildWarParticipantDto {
  id: string;
  matchId: string;
  memberId: string;
  member?: { id: string; internalMemberId: string; currentName: string; currentClass: GameClass };
  createdAt: string;
}

export interface GiveawayWinnerDto {
  id: string;
  giveawayId: string;
  memberId: string;
  order: number;
  spunAt: string;
  spunBy: string | null;
  member?: { id: string; internalMemberId: string; currentName: string } | null;
}

export interface GiveawayCandidateDto {
  id: string;
  internalMemberId: string;
  currentName: string;
}

export interface GiveawayDto {
  id: string;
  guildWarDayId: string;
  filterType: GiveawayFilterType;
  customFilter: Record<string, unknown> | null;
  candidateIds: string[];
  candidates: GiveawayCandidateDto[];
  candidateCount: number;
  remainingCandidateCount: number;
  winnerMemberId: string | null;
  winnerMember?: { id: string; internalMemberId: string; currentName: string } | null;
  winners: GiveawayWinnerDto[];
  spunAt: string | null;
  spunBy: string | null;
  createdAt: string;
}

export interface DungeonScheduleDto {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  maxPlayers: number;
  leaderId: string | null;
  leader?: { id: string; internalMemberId: string; currentName: string } | null;
  requiredClasses: GameClass[];
  status: DungeonStatus;
  registeredCount: number;
  registrations?: DungeonRegistrationDto[];
  createdAt: string;
  updatedAt: string;
}

export interface DungeonRegistrationDto {
  id: string;
  dungeonId: string;
  memberId: string;
  member?: { id: string; internalMemberId: string; currentName: string; currentClass: GameClass };
  registeredAt: string;
  cancelledAt: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDto {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: AuditAction;
  module: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface DashboardStats {
  members: {
    total: number;
    active: number;
    inactive: number;
    blacklisted: number;
    classDistribution: { class: GameClass; label: string; count: number }[];
    userGroupDistribution: {
      userGroupId: string | null;
      name: string;
      type: UserGroupType;
      count: number;
      activeCount: number;
    }[];
  };
  guildWar: {
    totalDays: number;
    totalMatches: number;
    attendanceRanking: { memberId: string; internalMemberId: string; name: string; count: number }[];
    topMvp: { memberId: string; internalMemberId: string; name: string; count: number }[];
  };
  giveaway: {
    totalSpins: number;
    topWinners: { memberId: string; internalMemberId: string; name: string; count: number }[];
  };
  dungeon: {
    totalSchedules: number;
    mostActiveLeaders: { memberId: string; internalMemberId: string; name: string; count: number }[];
    mostActiveMembers: { memberId: string; internalMemberId: string; name: string; count: number }[];
  };
  contribution: {
    ranking: { memberId: string; internalMemberId: string; name: string; points: number }[];
  };
}

export interface ImportResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export interface AddParticipantsByNamesResult {
  added: number;
  notFound: string[];
  ambiguous: {
    name: string;
    members: { id: string; internalMemberId: string; currentName: string }[];
  }[];
}

export interface GlobalSearchResult {
  members: MemberDto[];
  total: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
