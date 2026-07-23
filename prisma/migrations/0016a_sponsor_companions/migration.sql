-- Repare la chaine de migrations avant 0017_query_indexes.
--
-- Ces objets existent dans schema.prisma et sont utilises par les routes
-- sponsor/benediction et par les Compagnons IA, mais leur migration de creation
-- manquait. Le SQL est volontairement idempotent : certaines bases historiques
-- ont pu recevoir ces objets via `prisma db push`.

DO $$
BEGIN
  CREATE TYPE "ProfileKind" AS ENUM ('HUMAN', 'AI_COMPANION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "BlessingStatus" AS ENUM ('PENDING', 'BLESSED', 'CAUTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "kind" "ProfileKind" NOT NULL DEFAULT 'HUMAN';

CREATE TABLE IF NOT EXISTS "Sponsor" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "relation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Blessing" (
  "id" TEXT NOT NULL,
  "sponsorId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" "BlessingStatus" NOT NULL DEFAULT 'PENDING',
  "noteEncrypted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "Blessing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiCompanionMeta" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "langAnchor" TEXT NOT NULL,
  "temperament" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiCompanionMeta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Sponsor_userId_key"
  ON "Sponsor"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Blessing_token_key"
  ON "Blessing"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "AiCompanionMeta_userId_key"
  ON "AiCompanionMeta"("userId");

DO $$
BEGIN
  ALTER TABLE "Sponsor"
    ADD CONSTRAINT "Sponsor_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "Blessing"
    ADD CONSTRAINT "Blessing_sponsorId_fkey"
    FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "AiCompanionMeta"
    ADD CONSTRAINT "AiCompanionMeta_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
