import type {
  AuditLogDto,
  DashboardStats,
  DungeonScheduleDto,
  GiveawayDto,
  GlobalSearchResult,
  GuildWarDayDto,
  GuildWarAutoSyncResult,
  GuildWarMatchDto,
  ImportResult,
  MemberDto,
  MemberTimelineDto,
  PaginatedResponse,
  PaginationQuery,
  UserDto,
  UserGroupDto,
  UserGroupType,
} from "@guild/shared-types";
import { GameClass, GiveawayFilterType, Permission } from "@guild/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, uploadFile } from "@/lib/api";

export interface MemberQuery extends PaginationQuery {
  currentClass?: GameClass;
  isActive?: boolean;
  isBlacklisted?: boolean;
  tag?: string;
  userGroupType?: UserGroupType;
  userGroupId?: string;
}

export interface MemberImportPreview {
  valid: Array<{
    row: number;
    internalMemberId: string;
    currentName: string;
    currentClass: GameClass;
  }>;
  errors: { row: number; message: string }[];
  summary: { total: number; valid: number; invalid: number };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => unwrap<DashboardStats>(api.get("/reports/dashboard")),
  });
}

export function useMembers(query: MemberQuery) {
  return useQuery({
    queryKey: ["members", query],
    queryFn: () =>
      unwrap<PaginatedResponse<MemberDto>>(api.get("/members", { params: query })),
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ["member", id],
    queryFn: () => unwrap<MemberDto>(api.get(`/members/${id}`)),
    enabled: Boolean(id),
  });
}

export function useMemberTimeline(id: string) {
  return useQuery({
    queryKey: ["member-timeline", id],
    queryFn: () => unwrap<MemberTimelineDto[]>(api.get(`/members/${id}/timeline`)),
    enabled: Boolean(id),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MemberDto>) =>
      unwrap<MemberDto>(api.post("/members", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export interface BatchCreateMembersPayload {
  internalMemberId: string;
  currentName: string;
  currentClass: GameClass;
  joinDate?: string;
}

export interface BatchCreateMembersResult {
  created: number;
  failed: { index: number; internalMemberId: string; message: string }[];
}

export function useBatchCreateMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (members: BatchCreateMembersPayload[]) =>
      unwrap<BatchCreateMembersResult>(
        api.post("/members/batch", { members }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useUpdateMember(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MemberDto>) =>
      unwrap<MemberDto>(api.patch(`/members/${id}`, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["member", id] });
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/members/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function usePreviewMemberImport() {
  return useMutation({
    mutationFn: (file: File) =>
      uploadFile<MemberImportPreview>("/members/import/preview", file),
  });
}

export function useImportMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadFile<ImportResult>("/members/import", file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useGuildWarDays(query: PaginationQuery & { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["guild-war-days", query],
    queryFn: () =>
      unwrap<PaginatedResponse<GuildWarDayDto>>(api.get("/guild-war/days", { params: query })),
  });
}

export function useGuildWarDay(id: string) {
  return useQuery({
    queryKey: ["guild-war-day", id],
    queryFn: () => unwrap<GuildWarDayDto>(api.get(`/guild-war/days/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateGuildWarDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; note?: string; allowNonSaturday?: boolean }) =>
      unwrap<GuildWarDayDto>(api.post("/guild-war/days", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guild-war-days"] }),
  });
}

export function useSyncGuildWarSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap<GuildWarAutoSyncResult>(api.post("/guild-war/days/auto-sync")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guild-war-days"] }),
  });
}

export function useCreateMatch(dayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; order?: number; mvpMemberId?: string }) =>
      unwrap<GuildWarMatchDto>(api.post(`/guild-war/days/${dayId}/matches`, data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guild-war-day", dayId] }),
  });
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ["guild-war-match", id],
    queryFn: () => unwrap<GuildWarMatchDto>(api.get(`/guild-war/matches/${id}`)),
    enabled: Boolean(id),
  });
}

export function useAddParticipants(dayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      memberIds,
    }: {
      matchId: string;
      memberIds: string[];
    }) =>
      unwrap<GuildWarMatchDto>(
        api.post(`/guild-war/matches/${matchId}/participants`, { memberIds }),
      ),
    onSuccess: (_, { matchId }) => {
      qc.invalidateQueries({ queryKey: ["guild-war-match", matchId] });
      qc.invalidateQueries({ queryKey: ["guild-war-day", dayId] });
    },
  });
}

export function useImportParticipants(matchId: string, dayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      uploadFile<ImportResult>(`/guild-war/matches/${matchId}/participants/import`, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guild-war-match", matchId] });
      qc.invalidateQueries({ queryKey: ["guild-war-day", dayId] });
    },
  });
}

export function useGiveaways(query: PaginationQuery & { guildWarDayId?: string } = {}) {
  return useQuery({
    queryKey: ["giveaways", query],
    queryFn: () =>
      unwrap<PaginatedResponse<GiveawayDto>>(api.get("/giveaway", { params: query })),
  });
}

export function useGiveaway(id: string) {
  return useQuery({
    queryKey: ["giveaway", id],
    queryFn: () => unwrap<GiveawayDto>(api.get(`/giveaway/${id}`)),
    enabled: Boolean(id),
  });
}

export function useGenerateGiveaway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      guildWarDayId,
      filterType,
      memberIds,
      internalMemberIds,
    }: {
      guildWarDayId: string;
      filterType: GiveawayFilterType;
      memberIds?: string[];
      internalMemberIds?: string[];
    }) =>
      unwrap<GiveawayDto>(
        api.post(`/giveaway/days/${guildWarDayId}/generate`, {
          filterType,
          memberIds,
          internalMemberIds,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["giveaways"] });
      qc.invalidateQueries({ queryKey: ["giveaway"] });
    },
  });
}

export function useImportGiveawayCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ guildWarDayId, file }: { guildWarDayId: string; file: File }) =>
      uploadFile<GiveawayDto>(
        `/giveaway/days/${guildWarDayId}/generate/import`,
        file,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["giveaways"] });
      qc.invalidateQueries({ queryKey: ["giveaway"] });
    },
  });
}

export function useSpinGiveaway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<GiveawayDto>(api.post(`/giveaway/${id}/spin`)),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["giveaways"] });
      qc.invalidateQueries({ queryKey: ["giveaway", id] });
      qc.invalidateQueries({ queryKey: ["giveaway-winners"] });
    },
  });
}

export function useRemoveGiveawayCandidates(giveawayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: string[]) =>
      unwrap<GiveawayDto>(
        api.post(`/giveaway/${giveawayId}/candidates/remove`, { memberIds }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["giveaways"] });
      qc.invalidateQueries({ queryKey: ["giveaway", giveawayId] });
    },
  });
}

export function useGiveawayWinners(
  query: PaginationQuery & { guildWarDayId?: string; giveawayId?: string } = {},
) {
  return useQuery({
    queryKey: ["giveaway-winners", query],
    queryFn: () =>
      unwrap<
        PaginatedResponse<{
          id: string;
          giveawayId: string;
          memberId: string;
          order: number;
          spunAt: string;
          member?: { id: string; internalMemberId: string; currentName: string } | null;
          guildWarDayId?: string;
          filterType?: string;
        }>
      >(api.get("/giveaway/winners", { params: query })),
    enabled: Boolean(query.giveawayId || query.guildWarDayId || query.page),
  });
}

export function useDungeons(query: PaginationQuery & { status?: string } = {}) {
  return useQuery({
    queryKey: ["dungeons", query],
    queryFn: () =>
      unwrap<PaginatedResponse<DungeonScheduleDto>>(api.get("/dungeon", { params: query })),
  });
}

export function useDungeon(id: string) {
  return useQuery({
    queryKey: ["dungeon", id],
    queryFn: () => unwrap<DungeonScheduleDto>(api.get(`/dungeon/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateDungeon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      unwrap<DungeonScheduleDto>(api.post("/dungeon", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dungeons"] }),
  });
}

export function useRegisterDungeon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, memberId }: { id: string; memberId: string }) =>
      unwrap<DungeonScheduleDto>(api.post(`/dungeon/${id}/register`, { memberId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dungeons"] }),
  });
}

export function useCancelDungeonRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, memberId }: { id: string; memberId: string }) =>
      unwrap<DungeonScheduleDto>(
        api.post(`/dungeon/${id}/cancel-registration`, { memberId }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dungeons"] }),
  });
}

export function useUsers(query: PaginationQuery = {}) {
  return useQuery({
    queryKey: ["users", query],
    queryFn: () =>
      unwrap<PaginatedResponse<UserDto>>(api.get("/users", { params: query })),
  });
}

export function useUserGroups(
  query: PaginationQuery & { isActive?: boolean; type?: UserGroupType } = {},
) {
  return useQuery({
    queryKey: ["user-groups", query],
    queryFn: () =>
      unwrap<PaginatedResponse<UserGroupDto>>(api.get("/user-groups", { params: query })),
  });
}

export function useUserGroupOptions(type?: UserGroupType) {
  return useQuery({
    queryKey: ["user-group-options", type],
    queryFn: () =>
      unwrap<{ id: string; name: string; type: UserGroupType }[]>(
        api.get("/user-groups/options", { params: type ? { type } : undefined }),
      ),
  });
}

export function useCreateUserGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type: UserGroupType;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => unwrap<UserGroupDto>(api.post("/user-groups", data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-groups"] });
      qc.invalidateQueries({ queryKey: ["user-group-options"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["reports-full"] });
    },
  });
}

export function useUpdateUserGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      type?: UserGroupType;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => unwrap<UserGroupDto>(api.patch(`/user-groups/${id}`, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-groups"] });
      qc.invalidateQueries({ queryKey: ["user-group-options"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["reports-full"] });
    },
  });
}

export function useDeleteUserGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/user-groups/${id}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-groups"] });
      qc.invalidateQueries({ queryKey: ["user-group-options"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["reports-full"] });
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => unwrap<UserDto>(api.get(`/users/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      unwrap<UserDto>(api.post("/users", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      unwrap<UserDto>(api.patch(`/users/${id}`, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user", id] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/users/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetPassword(id: string) {
  return useMutation({
    mutationFn: (newPassword: string) =>
      unwrap(api.post(`/users/${id}/reset-password`, { newPassword })),
  });
}

export function useAuditLogs(query: PaginationQuery & { module?: string; action?: string } = {}) {
  return useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () =>
      unwrap<PaginatedResponse<AuditLogDto>>(api.get("/audit", { params: query })),
  });
}

export function useGlobalSearch(query: string, page = 1) {
  return useQuery({
    queryKey: ["search", query, page],
    queryFn: () =>
      unwrap<GlobalSearchResult>(
        api.get("/search", { params: { search: query, page, limit: 20 } }),
      ),
    enabled: query.trim().length >= 2,
  });
}

export function useReportData() {
  return useQuery({
    queryKey: ["reports-full"],
    queryFn: async () => {
      const [dashboard, classDist, attendance, mvp, winners, contribution] =
        await Promise.all([
          unwrap<DashboardStats>(api.get("/reports/dashboard")),
          unwrap<{ class: string; label: string; count: number }[]>(
            api.get("/reports/class-distribution"),
          ),
          unwrap<{ memberId: string; internalMemberId: string; name: string; count: number }[]>(
            api.get("/reports/attendance-ranking", { params: { limit: 20 } }),
          ),
          unwrap<{ memberId: string; internalMemberId: string; name: string; count: number }[]>(
            api.get("/reports/top-mvp", { params: { limit: 20 } }),
          ),
          unwrap<{ memberId: string; internalMemberId: string; name: string; count: number }[]>(
            api.get("/reports/top-giveaway-winners", { params: { limit: 20 } }),
          ),
          unwrap<{ memberId: string; internalMemberId: string; name: string; points: number }[]>(
            api.get("/reports/contribution-ranking", { params: { limit: 20 } }),
          ),
        ]);
      return { dashboard, classDist, attendance, mvp, winners, contribution };
    },
  });
}

export { Permission };
