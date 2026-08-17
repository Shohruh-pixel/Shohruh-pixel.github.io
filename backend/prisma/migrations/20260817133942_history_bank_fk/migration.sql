-- Orphans first. These rows reference banks that no longer exist — 21 of 118 on the live
-- database — and the foreign key cannot be created while they are present. They are also the
-- bug being fixed: SQLite reissues freed ids, so one of them could later attach itself to a
-- new bank and give it a movement arrow computed from a different bank''s rates.
DELETE FROM "RateHistory" WHERE "bankId" NOT IN (SELECT "id" FROM "Bank");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RateHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankId" INTEGER NOT NULL,
    "usdBuy" REAL NOT NULL,
    "usdSell" REAL NOT NULL,
    "rubBuy" REAL NOT NULL,
    "rubSell" REAL NOT NULL,
    "eurBuy" REAL NOT NULL,
    "eurSell" REAL NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'transfer',
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateHistory_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RateHistory" ("bankId", "eurBuy", "eurSell", "id", "rateType", "recordedAt", "rubBuy", "rubSell", "sourceLabel", "usdBuy", "usdSell") SELECT "bankId", "eurBuy", "eurSell", "id", "rateType", "recordedAt", "rubBuy", "rubSell", "sourceLabel", "usdBuy", "usdSell" FROM "RateHistory";
DROP TABLE "RateHistory";
ALTER TABLE "new_RateHistory" RENAME TO "RateHistory";
CREATE INDEX "RateHistory_bankId_recordedAt_idx" ON "RateHistory"("bankId", "recordedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
