# Liens de bénédiction — cycle de sécurité

## Frontière de confiance

Le lien Parrain/Marraine est un bearer public : sa possession autorise une
lecture minimale puis une réponse unique, sans session Chemin d’Alliance. Il ne
donne jamais accès au match, à l’autre membre, aux messages, au nom ni à
l’adresse du sponsor.

Le DTO public est limité à `filleulName` et au statut constant `PENDING`.

## Stockage et durée de vie

- Le bearer est généré avec 32 octets aléatoires (256 bits), encodés en
  Base64URL.
- Seul son SHA-256 hexadécimal est persisté dans `Blessing.tokenHash`.
- Le bearer brut n’existe qu’en mémoire le temps de construire l’email.
- Le TTL est de 72 heures (`BLESSING_TOKEN_TTL_MS`).
- Une réponse efface `tokenHash` et `expiresAt` dans le même CAS que le passage
  à `BLESSED` ou `CAUTION`.
- Les décisions historiques restent conservées mais ne peuvent plus être
  retrouvées par un bearer.

La migration `0024_blessing_token_hardening` ne hache volontairement aucun
ancien token : hacher un bearer déjà exposé prolongerait sa validité. Elle
supprime les anciens `PENDING`, conserve `BLESSED/CAUTION`, puis retire la
colonne en clair.

## Émission et livraison email

L’émission est une transaction `SERIALIZABLE`, rejouée au plus trois fois sur
les conflits PostgreSQL. Elle revalide dans la transaction :

1. le match `ACTIVE` ;
2. l’appartenance du demandeur ;
3. l’absence de blocage dans les deux sens ;
4. le sponsor courant.

L’index PostgreSQL partiel
`Blessing_one_pending_per_user_match` impose une seule ligne `PENDING` par
utilisateur et match, même sous double requête concurrente.

La livraison est activée en deux phases :

1. la transaction crée le hash avec `emailSentAt = NULL` ;
2. l’email est envoyé ;
3. un CAS pose `emailSentAt` seulement si le sponsor et le match sont encore
   valides.

Les routes publiques exigent `emailSentAt IS NOT NULL`. Un crash ou une panne
de base avant l’activation rend donc le lien inutilisable. Un retour `false` du
prestataire déclenche une révocation puis une réponse HTTP `502`, jamais un
succès. Une émission abandonnée peut être remplacée après un bail de 10
minutes ; son ancien lien reste inutilisable.

## Réponse et révocation

La réponse est un unique `updateMany` CAS exigeant simultanément :

- le bon hash ;
- `PENDING` ;
- un email confirmé ;
- une expiration future ;
- un match toujours `ACTIVE`, membre et non bloqué.

Deux réponses concurrentes ne peuvent donc pas gagner. La première efface le
hash ; la seconde échoue.

Les opérations suivantes suppriment les `PENDING` dans la même transaction que
leur changement d’état :

- changement ou suppression du sponsor ;
- clôture/refus du match ;
- blocage de l’un des deux membres.

La FK sponsor utilise `ON DELETE SET NULL` afin de préserver les décisions
historiques. Les FK vers `Match` et `User` sont ajoutées après un contrôle de
cohérence fail closed.

## En-têtes privés

La page `/:locale/parrain/:token` et l’API `/api/blessing/:token` reçoivent :

- `Cache-Control: private, no-store, max-age=0, must-revalidate` ;
- `Referrer-Policy: no-referrer` ;
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` ;
- les compatibilités `Pragma: no-cache` et `Expires: 0`.

Le service worker utilise déjà `NetworkOnly` pour les API et navigations.

## Déploiement et validation

La migration et le code doivent être déployés ensemble pendant une fenêtre
coordonnée : l’ancien code attend `token`, le nouveau attend `tokenHash`.

Commandes de validation locale :

```bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec vitest run tests/sponsor.test.ts tests/blessing.test.ts tests/blessing-routes.test.ts tests/sponsor-routes.test.ts tests/blocks.test.ts tests/match-decision-routes.test.ts tests/security-headers.test.ts
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

Le test unitaire couvre les doubles émission/réponse et les CAS perdants. Un
test PostgreSQL réel nécessite une base jetable ayant reçu toutes les
migrations ; il ne doit jamais être exécuté contre la production.
