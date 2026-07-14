-- CreateEnum
CREATE TYPE "GameClass" AS ENUM ('TO_VAN', 'THIET_Y', 'HUYET_HA', 'THAN_TUONG', 'CUU_LINH', 'TOAI_MONG', 'LONG_NGAM');

-- CreateEnum
CREATE TYPE "MemberTimelineEventType" AS ENUM ('JOINED', 'LEFT', 'REJOINED', 'NAME_CHANGED', 'CLASS_CHANGED', 'BLACKLISTED', 'UNBLACKLISTED', 'CONTRIBUTION_UPDATED', 'NOTE_UPDATED');

-- CreateEnum
CREATE TYPE "DungeonStatus" AS ENUM ('OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GiveawayFilterType" AS ENUM ('ALL_MATCHES_TODAY', 'MVP_TODAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT', 'RESET_PASSWORD', 'SPIN_GIVEAWAY', 'REGISTER', 'CANCEL_REGISTRATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "internalMemberId" TEXT NOT NULL,
    "currentName" TEXT NOT NULL,
    "currentClass" "GameClass" NOT NULL,
    "joinDate" TIMESTAMP(3),
    "leaveDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "kimLang" TEXT,
    "relationship" TEXT,
    "realLifeRelationship" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "contributionPoint" INTEGER NOT NULL DEFAULT 0,
    "guildWarAttendanceCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberNameHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberNameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberClassHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "gameClass" "GameClass" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberClassHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberTimeline" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "eventType" "MemberTimelineEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildWarDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildWarDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildWarMatch" (
    "id" TEXT NOT NULL,
    "guildWarDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "mvpMemberId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildWarMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildWarParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildWarParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Giveaway" (
    "id" TEXT NOT NULL,
    "guildWarDayId" TEXT NOT NULL,
    "filterType" "GiveawayFilterType" NOT NULL,
    "customFilter" JSONB,
    "candidateIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "winnerMemberId" TEXT,
    "spunAt" TIMESTAMP(3),
    "spunBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DungeonSchedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "leaderId" TEXT,
    "requiredClasses" "GameClass"[] DEFAULT ARRAY[]::"GameClass"[],
    "status" "DungeonStatus" NOT NULL DEFAULT 'OPEN',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DungeonSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DungeonRegistration" (
    "id" TEXT NOT NULL,
    "dungeonId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DungeonRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" "AuditAction" NOT NULL,
    "module" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_internalMemberId_key" ON "Member"("internalMemberId");

-- CreateIndex
CREATE INDEX "Member_currentName_idx" ON "Member"("currentName");

-- CreateIndex
CREATE INDEX "Member_currentClass_idx" ON "Member"("currentClass");

-- CreateIndex
CREATE INDEX "Member_isActive_idx" ON "Member"("isActive");

-- CreateIndex
CREATE INDEX "Member_isBlacklisted_idx" ON "Member"("isBlacklisted");

-- CreateIndex
CREATE INDEX "Member_kimLang_idx" ON "Member"("kimLang");

-- CreateIndex
CREATE INDEX "Member_contributionPoint_idx" ON "Member"("contributionPoint");

-- CreateIndex
CREATE INDEX "Member_guildWarAttendanceCount_idx" ON "Member"("guildWarAttendanceCount");

-- CreateIndex
CREATE INDEX "Member_deletedAt_idx" ON "Member"("deletedAt");

-- CreateIndex
CREATE INDEX "Member_tags_idx" ON "Member"("tags");

-- CreateIndex
CREATE INDEX "MemberNameHistory_memberId_idx" ON "MemberNameHistory"("memberId");

-- CreateIndex
CREATE INDEX "MemberNameHistory_name_idx" ON "MemberNameHistory"("name");

-- CreateIndex
CREATE INDEX "MemberClassHistory_memberId_idx" ON "MemberClassHistory"("memberId");

-- CreateIndex
CREATE INDEX "MemberClassHistory_gameClass_idx" ON "MemberClassHistory"("gameClass");

-- CreateIndex
CREATE INDEX "MemberTimeline_memberId_idx" ON "MemberTimeline"("memberId");

-- CreateIndex
CREATE INDEX "MemberTimeline_eventType_idx" ON "MemberTimeline"("eventType");

-- CreateIndex
CREATE INDEX "MemberTimeline_createdAt_idx" ON "MemberTimeline"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildWarDay_date_key" ON "GuildWarDay"("date");

-- CreateIndex
CREATE INDEX "GuildWarDay_date_idx" ON "GuildWarDay"("date");

-- CreateIndex
CREATE INDEX "GuildWarDay_deletedAt_idx" ON "GuildWarDay"("deletedAt");

-- CreateIndex
CREATE INDEX "GuildWarMatch_guildWarDayId_idx" ON "GuildWarMatch"("guildWarDayId");

-- CreateIndex
CREATE INDEX "GuildWarMatch_mvpMemberId_idx" ON "GuildWarMatch"("mvpMemberId");

-- CreateIndex
CREATE INDEX "GuildWarMatch_deletedAt_idx" ON "GuildWarMatch"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildWarMatch_guildWarDayId_order_key" ON "GuildWarMatch"("guildWarDayId", "order");

-- CreateIndex
CREATE INDEX "GuildWarParticipant_matchId_idx" ON "GuildWarParticipant"("matchId");

-- CreateIndex
CREATE INDEX "GuildWarParticipant_memberId_idx" ON "GuildWarParticipant"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildWarParticipant_matchId_memberId_key" ON "GuildWarParticipant"("matchId", "memberId");

-- CreateIndex
CREATE INDEX "Giveaway_guildWarDayId_idx" ON "Giveaway"("guildWarDayId");

-- CreateIndex
CREATE INDEX "Giveaway_winnerMemberId_idx" ON "Giveaway"("winnerMemberId");

-- CreateIndex
CREATE INDEX "Giveaway_spunAt_idx" ON "Giveaway"("spunAt");

-- CreateIndex
CREATE INDEX "DungeonSchedule_scheduledAt_idx" ON "DungeonSchedule"("scheduledAt");

-- CreateIndex
CREATE INDEX "DungeonSchedule_status_idx" ON "DungeonSchedule"("status");

-- CreateIndex
CREATE INDEX "DungeonSchedule_leaderId_idx" ON "DungeonSchedule"("leaderId");

-- CreateIndex
CREATE INDEX "DungeonSchedule_deletedAt_idx" ON "DungeonSchedule"("deletedAt");

-- CreateIndex
CREATE INDEX "DungeonRegistration_dungeonId_idx" ON "DungeonRegistration"("dungeonId");

-- CreateIndex
CREATE INDEX "DungeonRegistration_memberId_idx" ON "DungeonRegistration"("memberId");

-- CreateIndex
CREATE INDEX "DungeonRegistration_cancelledAt_idx" ON "DungeonRegistration"("cancelledAt");

-- CreateIndex
CREATE UNIQUE INDEX "DungeonRegistration_dungeonId_memberId_key" ON "DungeonRegistration"("dungeonId", "memberId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_idx" ON "AuditLog"("resourceId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberNameHistory" ADD CONSTRAINT "MemberNameHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberClassHistory" ADD CONSTRAINT "MemberClassHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTimeline" ADD CONSTRAINT "MemberTimeline_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWarMatch" ADD CONSTRAINT "GuildWarMatch_guildWarDayId_fkey" FOREIGN KEY ("guildWarDayId") REFERENCES "GuildWarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWarMatch" ADD CONSTRAINT "GuildWarMatch_mvpMemberId_fkey" FOREIGN KEY ("mvpMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWarParticipant" ADD CONSTRAINT "GuildWarParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GuildWarMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWarParticipant" ADD CONSTRAINT "GuildWarParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_guildWarDayId_fkey" FOREIGN KEY ("guildWarDayId") REFERENCES "GuildWarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_winnerMemberId_fkey" FOREIGN KEY ("winnerMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_spunBy_fkey" FOREIGN KEY ("spunBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DungeonSchedule" ADD CONSTRAINT "DungeonSchedule_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DungeonRegistration" ADD CONSTRAINT "DungeonRegistration_dungeonId_fkey" FOREIGN KEY ("dungeonId") REFERENCES "DungeonSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DungeonRegistration" ADD CONSTRAINT "DungeonRegistration_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

