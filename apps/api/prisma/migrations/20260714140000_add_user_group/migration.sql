-- CreateTable
CREATE TABLE "user_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_group_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "userGroupId" TEXT;

-- CreateIndex
CREATE INDEX "user_group_name_idx" ON "user_group"("name");

-- CreateIndex
CREATE INDEX "user_group_isActive_idx" ON "user_group"("isActive");

-- CreateIndex
CREATE INDEX "user_group_deletedAt_idx" ON "user_group"("deletedAt");

-- CreateIndex
CREATE INDEX "user_group_sortOrder_idx" ON "user_group"("sortOrder");

-- CreateIndex
CREATE INDEX "Member_userGroupId_idx" ON "Member"("userGroupId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "user_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
