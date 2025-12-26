-- AlterTable
ALTER TABLE "Order" ADD COLUMN "preparedById" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "readyAt" TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Order_preparedById_idx" ON "Order"("preparedById");
