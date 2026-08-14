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
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_RateHistory" ("bankId", "eurBuy", "eurSell", "id", "recordedAt", "rubBuy", "rubSell", "sourceLabel", "usdBuy", "usdSell") SELECT "bankId", "eurBuy", "eurSell", "id", "recordedAt", "rubBuy", "rubSell", "sourceLabel", "usdBuy", "usdSell" FROM "RateHistory";
DROP TABLE "RateHistory";
ALTER TABLE "new_RateHistory" RENAME TO "RateHistory";
CREATE INDEX "RateHistory_bankId_recordedAt_idx" ON "RateHistory"("bankId", "recordedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
