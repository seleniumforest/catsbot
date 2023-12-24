-- CreateTable
CREATE TABLE "Block" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "network" TEXT NOT NULL,
    "height" INTEGER NOT NULL,
    "time" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Token" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "network" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "ticker" TEXT NOT NULL,
    "coingeckoId" TEXT
);

-- CreateTable
CREATE TABLE "Validator" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "network" TEXT NOT NULL,
    "moniker" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "savedDate" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Price" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "coingeckoId" TEXT NOT NULL,
    "priceUsd" REAL NOT NULL,
    "savedDate" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotifyDenom" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "network" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "msg" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Block_network_key" ON "Block"("network");

-- CreateIndex
CREATE UNIQUE INDEX "Block_height_key" ON "Block"("height");

-- CreateIndex
CREATE UNIQUE INDEX "Token_identifier_key" ON "Token"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Validator_address_key" ON "Validator"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Price_coingeckoId_key" ON "Price"("coingeckoId");
