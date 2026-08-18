-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WithdrawalLimit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankId" INTEGER NOT NULL,
    "cardName" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "weeklyLimit" TEXT,
    "counterLimit" TEXT,
    "dailyLimit" TEXT,
    "monthlyLimit" TEXT,
    "commission" TEXT,
    "ownAtmNote" TEXT,
    "otherAtmNote" TEXT,
    "abroadNote" TEXT,
    "noteRu" TEXT,
    "noteTj" TEXT,
    "noteUz" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WithdrawalLimit_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WithdrawalLimit" ("abroadNote", "bankId", "cardName", "cardType", "commission", "counterLimit", "createdAt", "dailyLimit", "id", "monthlyLimit", "noteRu", "noteTj", "noteUz", "otherAtmNote", "ownAtmNote", "updatedAt", "weeklyLimit") SELECT "abroadNote", "bankId", "cardName", "cardType", "commission", "counterLimit", "createdAt", "dailyLimit", "id", "monthlyLimit", "noteRu", "noteTj", "noteUz", "otherAtmNote", "ownAtmNote", "updatedAt", "weeklyLimit" FROM "WithdrawalLimit";
DROP TABLE "WithdrawalLimit";
ALTER TABLE "new_WithdrawalLimit" RENAME TO "WithdrawalLimit";
CREATE INDEX "WithdrawalLimit_bankId_idx" ON "WithdrawalLimit"("bankId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
