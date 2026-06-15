# 0004_consolidate_schema — procédure de déploiement

Cette migration **consolide** la dérive accumulée : le schéma avait évolué via
`prisma db push` sans migrations correspondantes. Elle ajoute (par rapport à
0001→0003) : colonnes `User` (`country, deletedAt, phone, phoneVerified,
stripeCustomerId, subscriptionStatus`) + index unique `stripeCustomerId`,
`Match.requestedById` + index `Match_userBId`, tables `Block` et
`PhoneVerification` (+ index/FK), et les index/FK manquants sur `AgentInsight`.

Le SQL **n'est pas idempotent** (pas de `IF NOT EXISTS`). Selon la cible :

## Environnement NEUF (base vierge)
```bash
npx prisma migrate deploy   # joue 0001→0004 dans l'ordre, schéma identique au schema.prisma
```

## PRODUCTION EXISTANTE (déjà synchronisée via db push)
Tous les objets existent déjà : **ne PAS lancer `migrate deploy`** (échec
"already exists" → migration `failed` → déploiements bloqués).

1. **Snapshot Supabase** (sauvegarde).
2. Vérifier que la prod contient bien tout le contenu de 0004 :
   ```sql
   SELECT column_name FROM information_schema.columns
     WHERE table_name='Match' AND column_name='requestedById';      -- 1 ligne attendue
   SELECT to_regclass('"Block"'), to_regclass('"PhoneVerification"'); -- non NULL
   SELECT "stripeCustomerId", count(*) FROM "User"
     WHERE "stripeCustomerId" IS NOT NULL GROUP BY 1 HAVING count(*)>1; -- vide
   ```
   Si un objet manque, l'ajouter à la main (idempotent : `ADD COLUMN IF NOT EXISTS`
   / `CREATE TABLE IF NOT EXISTS`) AVANT le resolve.
3. Aligner l'historique `_prisma_migrations` SANS exécuter le DDL :
   ```bash
   npx prisma migrate resolve --applied 0001_init
   npx prisma migrate resolve --applied 0002_agents
   npx prisma migrate resolve --applied 0003_couple_seasons
   npx prisma migrate resolve --applied 0004_consolidate_schema
   ```
4. Contrôle : `npx prisma migrate status` → « Database schema is up to date ».

## Migrations FUTURES (important)
Le build Vercel (`prisma generate && next build`) **n'applique aucune migration**.
Après cette consolidation, choisir une stratégie pour les prochaines migrations :
- soit un step release `prisma migrate deploy` (utiliser une URL **directe**
  port 5432, pas le pooler pgbouncer) ;
- soit `migrate deploy` manuel en CI avant chaque release.
Sinon, une future migration laissera l'app avec un client Prisma attendant des
colonnes absentes → erreurs runtime P2022.
