-- CreateTable
CREATE TABLE "ScraperRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "banksUpdated" INTEGER NOT NULL DEFAULT 0,
    "banksChanged" INTEGER NOT NULL DEFAULT 0,
    "banksSkipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);

-- CreateIndex
CREATE INDEX "ScraperRun_startedAt_idx" ON "ScraperRun"("startedAt");
