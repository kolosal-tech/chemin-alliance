-- Durcissement des liens magiques Parrain/Marraine.
--
-- Invariants :
-- - aucun bearer brut n'est conservé en base ;
-- - les anciens bearers sont tous invalidés ;
-- - une seule demande PENDING peut exister par utilisateur et par match ;
-- - une demande PENDING doit avoir un sponsor, un hash et une expiration ;
-- - une réponse BLESSED/CAUTION conserve l'historique sans bearer utilisable.
--
-- Le déploiement applicatif qui lit tokenHash/expiresAt/emailSentAt doit être
-- coordonné avec cette migration (voir docs/security/blessing-links.md).

-- Fail closed avant toute mutation : l'ajout des FK ne doit ni masquer ni
-- supprimer silencieusement des données historiques incohérentes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Blessing" blessing
    LEFT JOIN "Sponsor" sponsor ON sponsor."id" = blessing."sponsorId"
    LEFT JOIN "User" owner ON owner."id" = blessing."userId"
    LEFT JOIN "Match" matched ON matched."id" = blessing."matchId"
    WHERE sponsor."id" IS NULL
      OR owner."id" IS NULL
      OR matched."id" IS NULL
      OR sponsor."userId" <> blessing."userId"
      OR blessing."userId" NOT IN (matched."userAId", matched."userBId")
  ) THEN
    RAISE EXCEPTION
      '0024 aborted: inconsistent Blessing ownership or linkage requires manual review';
  END IF;
END
$$;

ALTER TABLE "Blessing"
  ADD COLUMN "tokenHash" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "emailSentAt" TIMESTAMP(3);

-- Aucun token historique en clair n'est transformé en hash : le hacher
-- prolongerait sa validité. Les PENDING hérités sont supprimés pour permettre
-- une nouvelle émission sûre ; les décisions historiques sont conservées.
DELETE FROM "Blessing"
WHERE "status" = 'PENDING';

DROP INDEX IF EXISTS "Blessing_token_key";
ALTER TABLE "Blessing"
  DROP COLUMN "token";

-- La suppression d'un sponsor invalide explicitement ses PENDING dans la
-- transaction applicative. SET NULL conserve les décisions historiques.
ALTER TABLE "Blessing"
  DROP CONSTRAINT "Blessing_sponsorId_fkey";
ALTER TABLE "Blessing"
  ALTER COLUMN "sponsorId" DROP NOT NULL;
ALTER TABLE "Blessing"
  ADD CONSTRAINT "Blessing_sponsorId_fkey"
  FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Blessing"
  ADD CONSTRAINT "Blessing_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Blessing_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Blessing_tokenHash_key"
  ON "Blessing"("tokenHash");

DROP INDEX IF EXISTS "Blessing_userId_matchId_status_idx";
CREATE INDEX "Blessing_userId_matchId_status_idx"
  ON "Blessing"("userId", "matchId", "status");
CREATE INDEX "Blessing_matchId_idx"
  ON "Blessing"("matchId");

-- La contrainte déterministe tranche la concurrence d'émission, y compris si
-- une future route oublie la déduplication applicative.
CREATE UNIQUE INDEX "Blessing_one_pending_per_user_match"
  ON "Blessing"("userId", "matchId")
  WHERE "status" = 'PENDING';

ALTER TABLE "Blessing"
  ADD CONSTRAINT "Blessing_token_lifecycle_check"
  CHECK (
    (
      "status" = 'PENDING'
      AND "sponsorId" IS NOT NULL
      AND "tokenHash" IS NOT NULL
      AND "expiresAt" IS NOT NULL
      AND "expiresAt" > "createdAt"
      AND ("emailSentAt" IS NULL OR "emailSentAt" < "expiresAt")
    )
    OR
    (
      "status" IN ('BLESSED', 'CAUTION')
      AND "tokenHash" IS NULL
      AND "expiresAt" IS NULL
    )
  );
