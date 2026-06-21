-- Messagerie privée entre conjoints d'un Espace Couple (modèle CoupleMessage).
-- Le build Vercel n'exécute PAS `migrate deploy` → appliquer ce SQL manuellement
-- dans Supabase (SQL Editor) AVANT de déployer le code qui l'utilise.

CREATE TABLE "CoupleMessage" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "contentEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoupleMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoupleMessage_spaceId_createdAt_idx" ON "CoupleMessage"("spaceId", "createdAt");

ALTER TABLE "CoupleMessage" ADD CONSTRAINT "CoupleMessage_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "CoupleSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoupleMessage" ADD CONSTRAINT "CoupleMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
