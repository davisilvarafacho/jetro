-- CreateTable
CREATE TABLE "Cell" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "leaderId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cell_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MinistryMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ministryId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "role" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "MinistryMember_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MinistryMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CellMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cellId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "role" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CellMember_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CellMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Cell_name_key" ON "Cell"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MinistryMember_ministryId_memberId_key" ON "MinistryMember"("ministryId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CellMember_cellId_memberId_key" ON "CellMember"("cellId", "memberId");

-- Backfill: o líder de cada ministério passa a ter vínculo com role 1
INSERT INTO "MinistryMember" ("ministryId","memberId","role") SELECT "id","leaderId",1 FROM "Ministry";
