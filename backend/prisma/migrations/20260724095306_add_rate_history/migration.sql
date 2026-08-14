-- CreateTable
CREATE TABLE "RateHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankId" INTEGER NOT NULL,
    "usdBuy" REAL NOT NULL,
    "usdSell" REAL NOT NULL,
    "rubBuy" REAL NOT NULL,
    "rubSell" REAL NOT NULL,
    "eurBuy" REAL NOT NULL,
    "eurSell" REAL NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "RateHistory_bankId_recordedAt_idx" ON "RateHistory"("bankId", "recordedAt");
