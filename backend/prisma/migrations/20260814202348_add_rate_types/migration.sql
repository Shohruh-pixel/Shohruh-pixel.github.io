-- CreateTable
CREATE TABLE "Rate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "buy" REAL NOT NULL,
    "sell" REAL,
    "sourceLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rate_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExchangeRate" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExchangeRate_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExchangeRate" ("bankId", "createdAt", "eurBuy", "eurSell", "id", "rubBuy", "rubSell", "sourceLabel", "updatedAt", "usdBuy", "usdSell") SELECT "bankId", "createdAt", "eurBuy", "eurSell", "id", "rubBuy", "rubSell", "sourceLabel", "updatedAt", "usdBuy", "usdSell" FROM "ExchangeRate";
DROP TABLE "ExchangeRate";
ALTER TABLE "new_ExchangeRate" RENAME TO "ExchangeRate";
CREATE UNIQUE INDEX "ExchangeRate_bankId_key" ON "ExchangeRate"("bankId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Rate_bankId_type_idx" ON "Rate"("bankId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Rate_bankId_currency_type_key" ON "Rate"("bankId", "currency", "type");
