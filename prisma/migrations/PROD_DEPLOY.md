# Déploiement prod (Supabase) — migrations 0004 & 0005

Deux natures différentes :
- **0004_consolidate_schema** = capture de dérive. Les objets EXISTENT DÉJÀ en prod
  (ajoutés via db push). → on ne ré-exécute pas, on **marque appliqué** (resolve).
- **0005_engaged_season** = vrai changement neuf (`ENGAGED` n'existe PAS encore en
  prod). → il faut **réellement l'exécuter**, puis le marquer appliqué.

## Étape 0 — Sauvegarde
Faire un snapshot de la base Supabase avant toute opération.

## Voie A — la plus simple (tu es déjà dans le dashboard Supabase)
1. SQL Editor → exécuter :
   ```sql
   ALTER TYPE "LifeSeason" ADD VALUE IF NOT EXISTS 'ENGAGED';
   ```
2. En local, avec DATABASE_URL pointant la prod (URL directe port 5432, pas le pooler) :
   ```bash
   npx prisma migrate resolve --applied 0001_init
   npx prisma migrate resolve --applied 0002_agents
   npx prisma migrate resolve --applied 0003_couple_seasons
   npx prisma migrate resolve --applied 0004_consolidate_schema
   npx prisma migrate resolve --applied 0005_engaged_season
   npx prisma migrate status   # => "Database schema is up to date"
   ```

## Voie B — tout par migrate (sans toucher au SQL Editor)
Avec DATABASE_URL = prod (URL directe port 5432) :
```bash
# 1) marquer l'historique déjà présent (0001..0004) SANS exécuter le DDL
npx prisma migrate resolve --applied 0001_init
npx prisma migrate resolve --applied 0002_agents
npx prisma migrate resolve --applied 0003_couple_seasons
npx prisma migrate resolve --applied 0004_consolidate_schema
# 2) exécuter réellement la seule migration nouvelle (0005 = ADD VALUE ENGAGED)
npx prisma migrate deploy
npx prisma migrate status   # => "Database schema is up to date"
```
⚠️ NE PAS lancer `migrate deploy` AVANT d'avoir resolved 0001..0004 :
il tenterait de rejouer le DDL de 0004 (objets déjà existants) → échec "already exists".

## Vérifs post-déploiement
```sql
-- la valeur enum est bien là :
SELECT unnest(enum_range(NULL::"LifeSeason"));   -- doit inclure ENGAGED
```
Puis tester une inscription "Nous sommes déjà fiancés" sur le site.

## Migration 0006 — passwordResetToken / passwordResetExpires (reset MDP)
Vrai changement neuf (colonnes nullables additives). À appliquer AVANT/au déploiement
du code reset-password, sinon les routes `/api/auth/forgot-password` et
`/reset-password` renvoient P2022 (colonne absente).

SQL Editor Supabase (idempotent, ne casse pas si déjà appliqué) :
```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_passwordResetToken_key" ON "User"("passwordResetToken");
```
Puis marquer appliqué (DATABASE_URL = prod, URL directe 5432) :
```bash
npx prisma migrate resolve --applied 0006_password_reset
npx prisma migrate status   # => up to date
```
Vérif : `SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name LIKE 'passwordReset%';` (2 lignes).

## 0013_onboarding_done (Phase 2 — flag onboarding persistant)
Colonne additive nullable (pas de dialog RLS attendu, `ALTER`). SQL Editor :
```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingDoneAt" TIMESTAMP(3);
```
Puis marquer appliqué (DATABASE_URL = prod, URL directe 5432) :
```bash
npx prisma migrate resolve --applied 0013_onboarding_done
```
Vérif : `SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name='onboardingDoneAt';` (1 ligne).

## 0015_missing_fk_indexes (index manquants sur FK Booking.userId / CoupleMessage.senderId)
Index additifs purs (aucune colonne modifiée, pas de dialog RLS attendu). SQL Editor :
```sql
CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX IF NOT EXISTS "CoupleMessage_senderId_idx" ON "CoupleMessage"("senderId");
```
Puis marquer appliqué (DATABASE_URL = prod, URL directe 5432) :
```bash
npx prisma migrate resolve --applied 0015_missing_fk_indexes
```
Vérif : `SELECT indexname FROM pg_indexes WHERE indexname IN ('Booking_userId_idx', 'CoupleMessage_senderId_idx');` (2 lignes).

## 0016_session_version (revocation des sessions JWT sur changement/reset de MDP)
Colonne additive NOT NULL avec DEFAULT 0 (retro-compatible, pas de dialog RLS attendu).
À appliquer AVANT/au déploiement du code : sans elle, login / getSessionUser /
`/api/me/password` / `/reset-password` renvoient P2022 (colonne `sessionVersion` absente).
SQL Editor Supabase (idempotent) :
```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
```
Puis marquer appliqué (DATABASE_URL = prod, URL directe 5432) :
```bash
npx prisma migrate resolve --applied 0016_session_version
```
Vérif : `SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name='sessionVersion';` (1 ligne).

## 0017_query_indexes (index adaptés aux requêtes réelles — risque de dérive à l'échelle)
Index additifs purs (aucune colonne modifiée, pas de dialog RLS attendu). Remplace
l'index User de la migration 0009 par un ordre de colonnes qui reflète les filtres
réellement TOUJOURS présents dans `getSuggestions` (deletedAt, season, isVerified
avant gender, optionnel) ; ajoute des index pour la file de modération (Report),
la liste des matchs (Match), la dédup anti-spam des bénédictions (Blessing) et les
requêtes d'Espace Couple (CoupleSpace). Aucun de ces points n'est un bug aujourd'hui :
prépare la montée en charge. SQL Editor Supabase (idempotent) :
```sql
DROP INDEX IF EXISTS "User_season_isVerified_gender_deletedAt_idx";
CREATE INDEX IF NOT EXISTS "User_deletedAt_season_isVerified_gender_idx"
  ON "User"("deletedAt", "season", "isVerified", "gender");

CREATE INDEX IF NOT EXISTS "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Match_userAId_updatedAt_idx" ON "Match"("userAId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Match_userBId_updatedAt_idx" ON "Match"("userBId", "updatedAt");

DROP INDEX IF EXISTS "Blessing_userId_matchId_idx";
CREATE INDEX IF NOT EXISTS "Blessing_userId_matchId_status_idx"
  ON "Blessing"("userId", "matchId", "status");

CREATE INDEX IF NOT EXISTS "CoupleSpace_userAId_status_idx" ON "CoupleSpace"("userAId", "status");
CREATE INDEX IF NOT EXISTS "CoupleSpace_userBId_status_idx" ON "CoupleSpace"("userBId", "status");
```
Puis marquer appliqué (DATABASE_URL = prod, URL directe 5432) :
```bash
npx prisma migrate resolve --applied 0017_query_indexes
```
Vérif :
```sql
SELECT indexname FROM pg_indexes WHERE indexname IN (
  'User_deletedAt_season_isVerified_gender_idx',
  'Report_status_createdAt_idx',
  'Match_userAId_updatedAt_idx',
  'Match_userBId_updatedAt_idx',
  'Blessing_userId_matchId_status_idx',
  'CoupleSpace_userAId_status_idx',
  'CoupleSpace_userBId_status_idx'
);   -- doit renvoyer 7 lignes
```

## 0018_drop_alliance_lab (⚠️ MIGRATION DESTRUCTIVE — suppression du module Alliance Lab)

> **AVERTISSEMENT — PERTE DE DONNÉES IRRÉVERSIBLE.** Cette migration `DROP` les
> tables `AiPersona`, `GameSession`, `GameAnswer` et les types `GameType` /
> `GameSessionStatus`. **Toutes les parties et personas d'entraînement sont
> définitivement perdues.** Elle est à appliquer **manuellement et volontairement**,
> **JAMAIS en routine** ni automatiquement au déploiement. Elle ne touche **pas** aux
> Compagnons IA (`AiCompanionMeta`), qui sont un module distinct et vivant.

Le module « Alliance Lab » (jeu solo contre personas IA) est retiré du produit.
Avant d'exécuter : **faire un snapshot Supabase** (cf. Étape 0) — c'est irréversible.

DDL à exécuter (SQL Editor Supabase, idempotent, ordre des dépendances) :
```sql
DROP TABLE IF EXISTS "GameAnswer" CASCADE;
DROP TABLE IF EXISTS "GameSession" CASCADE;
DROP TABLE IF EXISTS "AiPersona" CASCADE;
DROP TYPE IF EXISTS "GameSessionStatus";
DROP TYPE IF EXISTS "GameType";
```
Puis marquer appliqué (DATABASE_URL = prod, URL directe 5432) :
```bash
npx prisma migrate resolve --applied 0018_drop_alliance_lab
```
Vérif (doit renvoyer 0 ligne) :
```sql
SELECT tablename FROM pg_tables
  WHERE tablename IN ('AiPersona', 'GameSession', 'GameAnswer');
SELECT typname FROM pg_type
  WHERE typname IN ('GameType', 'GameSessionStatus');
```

## 0019_couple_game (jeu de couple/match — 2 tables polymorphes, additif pur)
Deux nouvelles tables (`GameRound`, `GameRoundAnswer`) et deux nouveaux types
(`GameMode`, `GameRoundStatus`) pour le jeu de couple/match (construction C,
hybride, SANS FIN). Aucune table/colonne existante modifiée. À appliquer
AVANT/au déploiement du code : sans elles, les endpoints `/api/matches/[id]/game`
et `/api/couple/game` renvoient P2021 (table absente). SQL Editor Supabase
(idempotent) :
```sql
DO $$ BEGIN
  CREATE TYPE "GameMode" AS ENUM ('SHARED', 'GUESS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "GameRoundStatus" AS ENUM ('OPEN', 'REVEALED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "GameRound" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "coupleSpaceId" TEXT,
    "mode" "GameMode" NOT NULL,
    "questionKey" TEXT,
    "questionText" TEXT,
    "initiatorId" TEXT NOT NULL,
    "status" "GameRoundStatus" NOT NULL DEFAULT 'OPEN',
    "resultMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealedAt" TIMESTAMP(3),
    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GameRoundAnswer" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answerEncrypted" TEXT,
    "guessEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameRoundAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GameRound_matchId_createdAt_idx" ON "GameRound"("matchId", "createdAt");
CREATE INDEX IF NOT EXISTS "GameRound_coupleSpaceId_createdAt_idx" ON "GameRound"("coupleSpaceId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "GameRoundAnswer_roundId_userId_key" ON "GameRoundAnswer"("roundId", "userId");

DO $$ BEGIN
  ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_coupleSpaceId_fkey" FOREIGN KEY ("coupleSpaceId") REFERENCES "CoupleSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "GameRoundAnswer" ADD CONSTRAINT "GameRoundAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "GameRoundAnswer" ADD CONSTRAINT "GameRoundAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
```
Puis marquer appliqué (DATABASE_URL = prod, URL directe 5432) :
```bash
npx prisma migrate resolve --applied 0019_couple_game
```
Vérif (doit renvoyer 2 lignes pour les tables, 2 pour les types) :
```sql
SELECT tablename FROM pg_tables
  WHERE tablename IN ('GameRound', 'GameRoundAnswer');
SELECT typname FROM pg_type
  WHERE typname IN ('GameMode', 'GameRoundStatus');
```

## Futures migrations
Le build Vercel n'exécute pas `migrate deploy`. Tant que ce n'est pas automatisé
(step release `prisma migrate deploy` sur URL directe), appliquer chaque nouvelle
migration manuellement avant/juste après le déploiement du code.
