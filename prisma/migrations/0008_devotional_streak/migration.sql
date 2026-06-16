-- Dévotionnel quotidien : streak (jours consécutifs) porté par User.
ALTER TABLE "User" ADD COLUMN "lastDevotionDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;
