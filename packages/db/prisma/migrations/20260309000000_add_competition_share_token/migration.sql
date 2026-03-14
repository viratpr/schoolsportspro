-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Competition_shareToken_key" ON "Competition"("shareToken");
