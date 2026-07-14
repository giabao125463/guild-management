-- CreateEnum
CREATE TYPE "UserGroupType" AS ENUM ('KIM_LANG', 'TEAM', 'TINH_DUYEN');

-- AlterTable: add type to user_group
ALTER TABLE "user_group" ADD COLUMN "type" "UserGroupType";

-- Migrate existing groups by name heuristics
UPDATE "user_group" SET "type" = 'KIM_LANG' WHERE "name" ILIKE '%Kim Lang%' OR "name" ILIKE '%Kim Lang%';
UPDATE "user_group" SET "type" = 'TEAM' WHERE "type" IS NULL AND ("name" ILIKE '%Team%' OR "name" ILIKE '%PVP%');
UPDATE "user_group" SET "type" = 'TINH_DUYEN' WHERE "type" IS NULL AND "name" ILIKE '%Tình duyên%';
UPDATE "user_group" SET "type" = 'KIM_LANG' WHERE "type" IS NULL;

ALTER TABLE "user_group" ALTER COLUMN "type" SET NOT NULL;

CREATE INDEX "user_group_type_idx" ON "user_group"("type");

-- CreateTable: member_user_group assignments
CREATE TABLE "member_user_group" (
    "memberId" TEXT NOT NULL,
    "userGroupId" TEXT NOT NULL,
    "type" "UserGroupType" NOT NULL,

    CONSTRAINT "member_user_group_pkey" PRIMARY KEY ("memberId","type")
);

-- Migrate existing Member.userGroupId into assignments
INSERT INTO "member_user_group" ("memberId", "userGroupId", "type")
SELECT m."id", m."userGroupId", ug."type"
FROM "Member" m
JOIN "user_group" ug ON ug."id" = m."userGroupId"
WHERE m."userGroupId" IS NOT NULL AND m."deletedAt" IS NULL
ON CONFLICT ("memberId", "type") DO NOTHING;

-- Migrate kimLang text to KIM_LANG user groups
INSERT INTO "user_group" ("id", "name", "type", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  trim(kl."kimLang"),
  'KIM_LANG'::"UserGroupType",
  0,
  true,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT trim("kimLang") AS "kimLang"
  FROM "Member"
  WHERE "kimLang" IS NOT NULL AND trim("kimLang") <> '' AND "deletedAt" IS NULL
) kl
WHERE NOT EXISTS (
  SELECT 1 FROM "user_group" ug
  WHERE ug."type" = 'KIM_LANG' AND lower(ug."name") = lower(kl."kimLang") AND ug."deletedAt" IS NULL
);

INSERT INTO "member_user_group" ("memberId", "userGroupId", "type")
SELECT
  m."id",
  ug."id",
  'KIM_LANG'::"UserGroupType"
FROM "Member" m
JOIN "user_group" ug ON ug."type" = 'KIM_LANG' AND lower(ug."name") = lower(trim(m."kimLang"))
WHERE m."kimLang" IS NOT NULL AND trim(m."kimLang") <> '' AND m."deletedAt" IS NULL
ON CONFLICT ("memberId", "type") DO UPDATE SET "userGroupId" = EXCLUDED."userGroupId";

-- Drop old columns
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_userGroupId_fkey";
DROP INDEX IF EXISTS "Member_userGroupId_idx";
DROP INDEX IF EXISTS "Member_kimLang_idx";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "userGroupId";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "kimLang";

-- AddForeignKey
ALTER TABLE "member_user_group" ADD CONSTRAINT "member_user_group_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_user_group" ADD CONSTRAINT "member_user_group_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "user_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "member_user_group_userGroupId_idx" ON "member_user_group"("userGroupId");
