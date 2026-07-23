# Intégrité de l’Espace Couple

## Garanties

La migration `0023_couple_space_integrity` et `lib/couple-space.ts` imposent les
invariants suivants côté serveur et côté PostgreSQL :

- un match ne peut référencer qu’un seul `CoupleSpace` (`matchId` unique) ;
- une paire A/B ne peut avoir qu’un espace, quel que soit l’ordre des rôles
  (`pairKey` canonique unique) ;
- un utilisateur ne peut appartenir qu’à un espace, même s’il est `userAId`
  dans une écriture et `userBId` dans une autre (trigger et verrous
  transactionnels par membre) ;
- un espace `ACTIVE` possède exactement deux membres distincts ;
- les deux clés étrangères membre utilisent `ON DELETE RESTRICT` : une
  suppression dure ne peut ni effacer les données du conjoint ni contourner
  l’invariant `ACTIVE`; l’effacement de compte transfère ou détache d’abord
  explicitement l’espace ;
- les transitions sont monotones : `ENGAGED → MARRIED → PARENTS` ;
- le premier membre enregistre une demande, le second membre applique la
  transition par CAS dans une transaction `SERIALIZABLE` ;
- le statut matrimonial et la saison des deux profils ne changent qu’au moment
  du second consentement ;
- un code d’invitation possède 60 bits d’entropie, n’est jamais stocké ni
  journalisé en clair, est lié au HMAC de l’adresse destinataire, expire après
  72 heures et est effacé atomiquement lors de sa consommation ;
- rejoindre exige une session dont l’adresse email est vérifiée et identique à
  l’adresse invitée.

Les réponses contenant le code à émission unique utilisent
`Cache-Control: no-store`. Un nouvel envoi invalide l’ancien code.

## Migration et données existantes

La migration s’arrête avant toute modification si elle trouve :

- un couple avec deux identifiants identiques ;
- plusieurs espaces pour un même match ;
- un membre présent dans plusieurs espaces, y compris dans des rôles opposés ;
- un espace actif sans second membre.

Aucune fusion ou suppression relationnelle automatique n’est effectuée. Ces cas
doivent être examinés manuellement. Les anciens codes courts en clair sont
invalidés et mis à `NULL` ; les créateurs d’un espace en attente doivent envoyer
une nouvelle invitation. Cette rotation est volontaire et constitue la seule
perte fonctionnelle de compatibilité.

## Validation reproductible

Formatage (commande mutante, à exécuter puis relire dans le diff) :

```bash
pnpm exec prisma format
```

Validation statique et tests :

```bash
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec tsc --noEmit
pnpm exec vitest run tests/couple-space.test.ts tests/couple-routes.test.ts tests/agents.test.ts
```

Validation PostgreSQL isolée :

```bash
export DATABASE_URL='postgresql://.../db?schema=codex_couple_integrity_local'
pnpm exec prisma migrate deploy
pnpm exec tsx scripts/validate-couple-space-integrity.ts
pnpm exec tsx scripts/validate-couple-space-constraints.ts fk-restrict
pnpm exec tsx scripts/validate-couple-space-constraints.ts pair-required
```

Le script refuse une base distante et tout schéma dont le nom ne commence pas
par `codex_couple_integrity_`. Il vérifie en concurrence la création depuis un
match et l’invariant inter-rôles, puis vérifie la transition bilatérale et la
consommation unique d’une invitation liée à l’email. Les deux processus de
contraintes vérifient séparément le refus d’une suppression dure et l’obligation
de la paire canonique ; cette séparation évite de réutiliser une connexion que
certains proxys PostgreSQL ferment après une violation attendue.
