-- Consentement dédié au Coach IA interactif.
--
-- Aucun backfill volontaire : toutes les lignes existantes conservent des
-- dimensions NULL et ne peuvent donc jamais satisfaire le contrôle exact du
-- serveur. Chaque membre doit consentir explicitement à la version courante.

ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'AI_COACH_INTERACTION';

ALTER TABLE "Consent"
  ADD COLUMN "version" TEXT,
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "recipient" TEXT;

CREATE INDEX "Consent_userId_type_version_revokedAt_idx"
  ON "Consent"("userId", "type", "version", "revokedAt");

-- Défense en profondeur contre deux consentements actifs identiques lors de
-- requêtes concurrentes. Les anciennes versions peuvent rester historisées,
-- mais la route de recueil révoque toute version active avant une nouvelle.
CREATE UNIQUE INDEX "Consent_ai_coach_active_scope_key"
  ON "Consent"("userId", "type", "version", "purpose", "recipient")
  WHERE "revokedAt" IS NULL
    AND "version" IS NOT NULL
    AND "purpose" IS NOT NULL
    AND "recipient" IS NOT NULL;

-- Réservation courte d'un transfert déjà admis. Le réseau s'exécute hors
-- transaction ; un retrait attend uniquement ces baux, jusqu'à leur clôture
-- effective ou leur expiration bornée.
CREATE TABLE "AiCoachTransferLease" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "consentId" TEXT NOT NULL,
  "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiCoachTransferLease_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiCoachTransferLease_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiCoachTransferLease_consentId_fkey"
    FOREIGN KEY ("consentId") REFERENCES "Consent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AiCoachTransferLease_userId_admittedAt_expiresAt_idx"
  ON "AiCoachTransferLease"("userId", "admittedAt", "expiresAt");

CREATE INDEX "AiCoachTransferLease_expiresAt_idx"
  ON "AiCoachTransferLease"("expiresAt");
