-- Espace Couple : invariants relationnels, transitions bilatérales et
-- invitations à usage unique. Cette migration est volontairement fail-closed :
-- elle s'arrête avant toute modification si les données historiques violent un
-- invariant qu'il serait dangereux de "réparer" automatiquement.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CoupleSpace"
    WHERE "userBId" IS NOT NULL AND "userAId" = "userBId"
  ) THEN
    RAISE EXCEPTION '0023 aborted: self-couple data requires manual review';
  END IF;

  IF EXISTS (
    SELECT "matchId"
    FROM "CoupleSpace"
    WHERE "matchId" IS NOT NULL
    GROUP BY "matchId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '0023 aborted: duplicate match couple spaces require manual review';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CoupleSpace" space
    LEFT JOIN "Match" matched ON matched."id" = space."matchId"
    WHERE space."matchId" IS NOT NULL
      AND (
        matched."id" IS NULL
        OR space."userBId" IS NULL
        OR NOT (
          (space."userAId" = matched."userAId" AND space."userBId" = matched."userBId")
          OR
          (space."userAId" = matched."userBId" AND space."userBId" = matched."userAId")
        )
      )
  ) THEN
    RAISE EXCEPTION '0023 aborted: invalid match couple linkage requires manual review';
  END IF;

  IF EXISTS (
    SELECT member_id
    FROM (
      SELECT "userAId" AS member_id FROM "CoupleSpace"
      UNION ALL
      SELECT "userBId" AS member_id
      FROM "CoupleSpace"
      WHERE "userBId" IS NOT NULL
    ) AS memberships
    GROUP BY member_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '0023 aborted: duplicate couple memberships require manual review';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CoupleSpace"
    WHERE "status" = 'ACTIVE' AND "userBId" IS NULL
  ) THEN
    RAISE EXCEPTION '0023 aborted: active couple space without two members requires manual review';
  END IF;
END
$$;

ALTER TABLE "CoupleSpace"
  ADD COLUMN "pairKey" TEXT,
  ADD COLUMN "inviteCodeHash" TEXT,
  ADD COLUMN "inviteEmailHash" TEXT,
  ADD COLUMN "inviteExpiresAt" TIMESTAMP(3),
  ADD COLUMN "seasonRequestedBy" TEXT,
  ADD COLUMN "seasonRequestedTarget" "LifeSeason",
  ADD COLUMN "seasonRequestedAt" TIMESTAMP(3);

UPDATE "CoupleSpace"
SET "pairKey" =
  CASE
    WHEN "userBId" IS NULL THEN NULL
    ELSE LEAST("userAId", "userBId") || ':' || GREATEST("userAId", "userBId")
  END;

-- Les anciens codes courts en clair ne sont ni convertis ni prolongés : ils
-- sont invalidés. Le créateur pourra émettre une nouvelle invitation liée à
-- l'adresse destinataire et expirant après 72 heures.
UPDATE "CoupleSpace" SET "inviteCode" = NULL;
ALTER TABLE "CoupleSpace" ALTER COLUMN "inviteCode" DROP NOT NULL;

CREATE UNIQUE INDEX "CoupleSpace_pairKey_key"
  ON "CoupleSpace"("pairKey");
CREATE UNIQUE INDEX "CoupleSpace_matchId_key"
  ON "CoupleSpace"("matchId");
CREATE UNIQUE INDEX "CoupleSpace_inviteCodeHash_key"
  ON "CoupleSpace"("inviteCodeHash");

ALTER TABLE "CoupleSpace"
  ADD CONSTRAINT "CoupleSpace_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Une suppression dure d'un membre ne doit ni effacer les données de l'autre
-- par cascade, ni laisser un espace ACTIVE avec un membre NULL. Le workflow
-- d'effacement transfère/détache explicitement l'espace avant pseudonymisation.
ALTER TABLE "CoupleSpace"
  DROP CONSTRAINT "CoupleSpace_userAId_fkey",
  DROP CONSTRAINT "CoupleSpace_userBId_fkey";
ALTER TABLE "CoupleSpace"
  ADD CONSTRAINT "CoupleSpace_userAId_fkey"
  FOREIGN KEY ("userAId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CoupleSpace_userBId_fkey"
  FOREIGN KEY ("userBId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CoupleSpace"
  ADD CONSTRAINT "CoupleSpace_distinct_members_check"
  CHECK ("userBId" IS NULL OR "userAId" <> "userBId"),
  ADD CONSTRAINT "CoupleSpace_pair_key_check"
  CHECK (
    ("userBId" IS NULL AND "pairKey" IS NULL)
    OR
    (
      "userBId" IS NOT NULL
      AND "pairKey" IS NOT NULL
      AND "pairKey" =
        LEAST("userAId", "userBId") || ':' || GREATEST("userAId", "userBId")
    )
  ),
  ADD CONSTRAINT "CoupleSpace_active_members_check"
  CHECK ("status" <> 'ACTIVE' OR "userBId" IS NOT NULL),
  ADD CONSTRAINT "CoupleSpace_invite_state_check"
  CHECK (
    (
      "inviteCodeHash" IS NULL
      AND "inviteEmailHash" IS NULL
      AND "inviteExpiresAt" IS NULL
    )
    OR
    (
      "status" = 'PENDING'
      AND "userBId" IS NULL
      AND "inviteCodeHash" IS NOT NULL
      AND "inviteEmailHash" IS NOT NULL
      AND "inviteExpiresAt" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "CoupleSpace_season_request_check"
  CHECK (
    (
      "seasonRequestedBy" IS NULL
      AND "seasonRequestedTarget" IS NULL
      AND "seasonRequestedAt" IS NULL
    )
    OR
    (
      "status" = 'ACTIVE'
      AND "userBId" IS NOT NULL
      AND "seasonRequestedBy" IS NOT NULL
      AND "seasonRequestedTarget" IS NOT NULL
      AND "seasonRequestedBy" IN ("userAId", "userBId")
      AND "seasonRequestedAt" IS NOT NULL
      AND (
        ("season" = 'ENGAGED' AND "seasonRequestedTarget" = 'MARRIED')
        OR
        ("season" = 'MARRIED' AND "seasonRequestedTarget" = 'PARENTS')
      )
    )
  );

-- Les verrous consultatifs par membre ferment le trou laissé par deux index
-- uniques séparés (userAId/userBId) : deux transactions concurrentes ne peuvent
-- pas insérer le même utilisateur dans des rôles opposés.
CREATE FUNCTION "enforce_couple_space_membership"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  first_member TEXT;
  second_member TEXT;
BEGIN
  IF NEW."matchId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "Match" matched
    WHERE matched."id" = NEW."matchId"
      AND (
        (matched."userAId" = NEW."userAId" AND matched."userBId" = NEW."userBId")
        OR
        (matched."userAId" = NEW."userBId" AND matched."userBId" = NEW."userAId")
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'couple space match linkage invariant violated';
  END IF;

  first_member := LEAST(NEW."userAId", COALESCE(NEW."userBId", NEW."userAId"));
  second_member := GREATEST(NEW."userAId", COALESCE(NEW."userBId", NEW."userAId"));

  PERFORM pg_advisory_xact_lock(hashtextextended('couple-space:' || first_member, 0));
  IF second_member <> first_member THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('couple-space:' || second_member, 0));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CoupleSpace" existing
    WHERE existing."id" <> NEW."id"
      AND (
        existing."userAId" = NEW."userAId"
        OR existing."userBId" = NEW."userAId"
        OR (
          NEW."userBId" IS NOT NULL
          AND (
            existing."userAId" = NEW."userBId"
            OR existing."userBId" = NEW."userBId"
          )
        )
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'couple space membership invariant violated';
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER "CoupleSpace_membership_guard"
BEFORE INSERT OR UPDATE OF "userAId", "userBId", "matchId"
ON "CoupleSpace"
FOR EACH ROW
EXECUTE FUNCTION "enforce_couple_space_membership"();

-- Défense en profondeur : même une écriture hors API ne peut pas revenir à une
-- saison antérieure ou sauter une étape.
CREATE FUNCTION "enforce_couple_space_season_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."season" <> OLD."season" AND NOT (
    (OLD."season" = 'ENGAGED' AND NEW."season" = 'MARRIED')
    OR
    (OLD."season" = 'MARRIED' AND NEW."season" = 'PARENTS')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'couple space season transition invariant violated';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "CoupleSpace_season_guard"
BEFORE UPDATE OF "season"
ON "CoupleSpace"
FOR EACH ROW
EXECUTE FUNCTION "enforce_couple_space_season_transition"();
