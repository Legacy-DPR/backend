/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `telegramId` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "telegramId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_telegramId_key" ON "Employee"("telegramId");
