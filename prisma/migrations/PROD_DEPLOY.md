# Déployer les migrations en production

Ce runbook est la procédure canonique pour l’arbre `0001` à `0025`. Les notes
présentes dans un dossier de migration décrivent son contexte historique ; elles
ne remplacent pas cette procédure.

## Principes non négociables

- Utiliser une URL PostgreSQL **directe**, jamais un pooler transactionnel.
- Faire un snapshot restaurable et vérifier la restauration avant le DDL.
- Ne jamais exécuter `prisma migrate resolve --applied` pour contourner une
  erreur. Cette commande n’est acceptable que pour l’ancienne base ayant connu
  `db push`, après comparaison objet par objet et approbation explicite.
- Ne jamais exécuter `pnpm seed` contre la production.
- Lire chaque migration en attente. `0018_drop_alliance_lab` détruit des tables
  et exige une décision métier et une sauvegarde dédiées.
- Déployer migration et code de `0024_blessing_token_hardening` dans une fenêtre
  coordonnée : l’ancienne version lit `token`, la nouvelle lit `tokenHash`.
- Appliquer `0025_ai_coach_consent` avant le code qui active le Coach IA
  interactif : aucune ligne existante ne doit être transformée en consentement.

## 1. Préparer

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma validate
pnpm exec prisma migrate status
```

Conserver la sortie de `migrate status` dans le ticket de déploiement. Vérifier
que `DATABASE_URL` cible bien le projet et l’environnement attendus, sans
afficher ses identifiants dans les journaux.

Créer ensuite :

1. un snapshot de la base ;
2. un export des métadonnées `_prisma_migrations` ;
3. un plan de retour à la version précédente du code ;
4. une fenêtre de maintenance si `0018`, `0022`, `0023` ou `0024` est en attente.

## 2. Cas d’une base neuve

Sur une base vide :

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

Toutes les migrations doivent être appliquées jusqu’à
`0025_ai_coach_consent`. Ne marquer aucune migration manuellement.

## 3. Cas de l’ancienne production issue de `db push`

La migration `0004_consolidate_schema` a été créée pour capturer une dérive
historique. Si et seulement si cette production contient déjà exactement les
objets `0001` à `0004` :

1. comparer le schéma réel au SQL de chaque migration ;
2. joindre les preuves au ticket ;
3. faire approuver l’alignement ;
4. utiliser `prisma migrate resolve --applied` uniquement pour les migrations
   dont chaque objet est déjà présent et compatible.

Au moindre doute, arrêter le déploiement. Ne pas improviser de SQL idempotent
dans le dashboard et ne pas marquer une migration partiellement appliquée.

## 4. Revue des migrations sensibles

### `0018_drop_alliance_lab`

Cette migration supprime définitivement `AiPersona`, `GameSession`,
`GameAnswer`, `GameType` et `GameSessionStatus`. Elle ne doit être exécutée
qu’après validation explicite que ces données ne sont plus requises et après
test de restauration du snapshot.

### `0020_photo_blurhash`

La colonne est additive. Après le déploiement, si des photos historiques
existent et que Supabase Storage est configuré :

```bash
pnpm backfill:blurhash
```

Le script est idempotent mais best-effort par photo. Contrôler son nombre
d’échecs avant de clore le déploiement.

### Chiffrement `AgentInsight`

Le backfill est en lecture seule par défaut :

```bash
pnpm backfill:agent-insights
pnpm backfill:agent-insights -- --apply
pnpm backfill:agent-insights
```

Le dernier passage doit indiquer `legacy=0`. Le script ne journalise aucun
contenu.

### `0022_alliance_answer_encryption`

Suivre [la procédure dédiée](../../docs/security/alliance-answer-encryption.md).
Après arrêt de toutes les anciennes instances :

```bash
pnpm exec tsx scripts/backfill-alliance-answers.ts
```

La sortie finale doit contenir `legacyRemaining=0 missingAnswer=0`.

### `0023_couple_space_integrity`

La migration est fail-closed : elle refuse les couples incohérents au lieu de
les fusionner ou supprimer. Les anciens codes d’invitation en clair sont
invalidés. Voir
[le runbook d’intégrité](../../docs/security/couple-space-integrity.md).

### `0024_blessing_token_hardening`

La migration refuse les liens orphelins, invalide tous les anciens bearers,
supprime les demandes `PENDING` héritées et retire la colonne `token` en clair.
Les décisions déjà rendues sont conservées. Déployer le nouveau code dans la
même fenêtre. Voir
[le cycle de sécurité des liens](../../docs/security/blessing-links.md).

### `0025_ai_coach_consent`

La migration ajoute le type `AI_COACH_INTERACTION`, les colonnes nullable
`version`, `purpose` et `recipient`, puis la table
`AiCoachTransferLease`. Elle ne contient volontairement aucun `INSERT`,
`UPDATE` ni backfill : les consentements historiques restent incomplets et ne
peuvent pas autoriser un appel fournisseur.

`ALTER TABLE`, la création de la table de baux et des quatre index ne sont pas
`CONCURRENTLY` et
peuvent attendre un verrou sur `Consent`. Mesurer la taille de cette table,
observer les transactions longues et choisir une fenêtre à faible trafic. Ne
pas transformer manuellement ces index en `CONCURRENTLY` dans le fichier déjà
versionné : cela modifierait la somme de contrôle Prisma et demande un plan de
migration séparé.

Déployer la migration avant le nouveau code. La version applicative courante
utilise `ai-coach-interactive-2026-07-23.v3` et enregistre comme `recipient` une
empreinte `sha256:` du fournisseur, des modèles, des opérateurs d'inférence et
de la politique de routage. `OPENROUTER_ALLOWED_PROVIDERS` est obligatoire avec
OpenRouter. Tout ancien accord, y compris une ligne `v1` ou `v2`, doit donc être
présenté comme inactif et recueilli à nouveau dans l'interface.

Après application, vérifier :

```sql
SELECT COUNT(*) AS implicit_ai_coach_consents
FROM "Consent"
WHERE "type" = 'AI_COACH_INTERACTION';
```

Sur une production qui n'a pas encore exposé ce recueil, le résultat attendu
est `0`. Ne jamais insérer ou compléter ces lignes manuellement ; chaque membre
doit utiliser l'interface versionnée.

Après le premier accord de recette, vérifier sans journaliser l'identifiant du
membre :

```sql
SELECT "version", "purpose",
       left("recipient", 7) AS recipient_prefix,
       ("revokedAt" IS NULL) AS active
FROM "Consent"
WHERE "type" = 'AI_COACH_INTERACTION'
ORDER BY "grantedAt" DESC
LIMIT 5;
```

La ligne courante doit porter la version `v3`, la finalité
`INTERACTIVE_DISCERNMENT_SUPPORT`, le préfixe `sha256:` et être active. Après
retrait, aucune ligne de cette finalité ne doit rester active. Une ligne
technique révoquée portant `AI_COACH_REVOCATION_BARRIER` est alors attendue :
elle est unique par membre au niveau applicatif et rafraîchie lors des retraits
suivants afin d'empêcher un recueil concurrent antérieur de dépasser la
barrière.

Pendant un appel de recette, un bail `AiCoachTransferLease` doit être visible,
puis disparaître à la fin de la réponse. Il expire au plus tard après
20 secondes. Un retrait concurrent doit répondre seulement après disparition
ou expiration des baux admis avant sa révocation, sans conserver de transaction
ouverte pendant cette attente.

## 5. Appliquer

Après approbation des points précédents :

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

Ne pas déployer le code si `migrate deploy` ou `migrate status` échoue. Ne pas
utiliser `resolve` comme réparation automatique.

## 6. Vérifier

Avec les variables de l’environnement de production :

```bash
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

Puis vérifier sans données réelles dans les journaux :

- authentification et renvoi d’email ;
- suggestions d’un compte vérifié ;
- blocage et signalement ;
- lecture/envoi de message ;
- export et suppression depuis un compte de recette ;
- Coach IA fermé avant consentement, ouvert après recueil exact, puis fermé à
  nouveau immédiatement après retrait sans suppression du compte ;
- checkout Stripe en mode test et réception du webhook signé ;
- absence de cache privé dans le service worker ;
- en-têtes CSP, HSTS et `no-store` sur les routes sensibles.

Les scripts `validate-couple-space-*` et `validate-account-deletion` sont
réservés à une base locale jetable. Leurs garde-fous refusent ou doivent refuser
une base distante ; ne jamais les pointer vers la production.

## Retour arrière

Prisma ne génère pas de down migration automatique. Si une migration de données
ou destructive doit être annulée :

1. arrêter le trafic ;
2. restaurer le snapshot testé ;
3. redéployer la version de code compatible avec ce snapshot ;
4. vérifier `_prisma_migrations` et les parcours critiques avant réouverture.

Un simple rollback du code est insuffisant après `0022` ou `0024`.
