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

## Futures migrations
Le build Vercel n'exécute pas `migrate deploy`. Tant que ce n'est pas automatisé
(step release `prisma migrate deploy` sur URL directe), appliquer chaque nouvelle
migration manuellement avant/juste après le déploiement du code.
