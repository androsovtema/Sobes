-- CreateTable
CREATE TABLE "yandex_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yandexId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yandex_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "yandex_accounts_userId_key" ON "yandex_accounts"("userId");

-- CreateIndex
CREATE INDEX "yandex_accounts_yandexId_idx" ON "yandex_accounts"("yandexId");

-- AddForeignKey
ALTER TABLE "yandex_accounts" ADD CONSTRAINT "yandex_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
