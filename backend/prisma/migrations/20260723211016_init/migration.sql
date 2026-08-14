-- CreateTable
CREATE TABLE "Bank" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameTj" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankId" INTEGER NOT NULL,
    "usdBuy" REAL NOT NULL,
    "usdSell" REAL NOT NULL,
    "rubBuy" REAL NOT NULL,
    "rubSell" REAL NOT NULL,
    "eurBuy" REAL NOT NULL,
    "eurSell" REAL NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExchangeRate_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WithdrawalLimit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankId" INTEGER NOT NULL,
    "cardName" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "dailyLimit" TEXT NOT NULL,
    "monthlyLimit" TEXT NOT NULL,
    "commission" TEXT NOT NULL,
    "ownAtmNote" TEXT NOT NULL,
    "otherAtmNote" TEXT NOT NULL,
    "abroadNote" TEXT NOT NULL,
    "noteRu" TEXT NOT NULL,
    "noteTj" TEXT NOT NULL,
    "noteUz" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WithdrawalLimit_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Bank_slug_key" ON "Bank"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_bankId_key" ON "ExchangeRate"("bankId");

-- CreateIndex
CREATE INDEX "WithdrawalLimit_bankId_idx" ON "WithdrawalLimit"("bankId");
