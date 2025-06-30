/*
  Warnings:

  - You are about to drop the column `foodCoopUsername` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "foodCoopUsername",
ADD COLUMN     "coopPassword" TEXT,
ADD COLUMN     "coopUsername" TEXT;
