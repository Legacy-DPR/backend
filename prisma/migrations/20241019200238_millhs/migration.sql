/*
  Warnings:

  - You are about to drop the `UserDetails` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserDetails" DROP CONSTRAINT "UserDetails_userId_fkey";

-- DropTable
DROP TABLE "UserDetails";

-- CreateTable
CREATE TABLE "ServiceClient" (
    "secretToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ServiceClient_pkey" PRIMARY KEY ("secretToken")
);
