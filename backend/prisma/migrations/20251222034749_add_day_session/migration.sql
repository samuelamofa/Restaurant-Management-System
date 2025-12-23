-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'system',
    "restaurantName" TEXT NOT NULL DEFAULT 'De Fusion Flame Kitchen',
    "restaurantAddress" TEXT,
    "restaurantPhone" TEXT,
    "restaurantEmail" TEXT,
    "taxRate" REAL NOT NULL DEFAULT 0.05,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "currencySymbol" TEXT NOT NULL DEFAULT '₵',
    "orderPrefix" TEXT NOT NULL DEFAULT 'ORD',
    "autoConfirmOrders" BOOLEAN NOT NULL DEFAULT false,
    "requirePaymentBeforePrep" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DaySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "closedById" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "totalCash" REAL NOT NULL DEFAULT 0,
    "totalCard" REAL NOT NULL DEFAULT 0,
    "totalMomo" REAL NOT NULL DEFAULT 0,
    "totalPaystack" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DaySession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DaySession_date_key" ON "DaySession"("date");

-- CreateIndex
CREATE INDEX "DaySession_date_idx" ON "DaySession"("date");

-- CreateIndex
CREATE INDEX "DaySession_isClosed_idx" ON "DaySession"("isClosed");

-- CreateIndex
CREATE INDEX "DaySession_closedAt_idx" ON "DaySession"("closedAt");
