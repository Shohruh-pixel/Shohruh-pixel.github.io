-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "route" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "ErrorLog_lastSeen_idx" ON "ErrorLog"("lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorLog_fingerprint_key" ON "ErrorLog"("fingerprint");

-- CreateIndex
CREATE INDEX "DailyStat_day_idx" ON "DailyStat"("day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_day_metric_path_key" ON "DailyStat"("day", "metric", "path");
