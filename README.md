# Chemin d’Alliance

Chemin d’Alliance est une plateforme chrétienne de discernement et
d’accompagnement vers le mariage, pas une application de swipe.

Socle actuel :

- Next.js 15.5.21, App Router, React 18 et TypeScript strict ;
- PostgreSQL et Prisma 6 ;
- PWA installable, quatre langues : français, anglais, espagnol et portugais ;
- authentification Argon2id et JWT révocable en cookie
  `httpOnly`/`Secure`/`SameSite` ;
- chiffrement applicatif AES-256-GCM des contenus sensibles.

## État fonctionnel honnête

Fonctionnel et protégé côté serveur :

- inscription, vérification email, session et réinitialisation du mot de passe ;
- suggestions progressives, demandes bilatérales, messagerie et étapes
  d’Alliance ;
- blocage, signalement, anti-partage prématuré de coordonnées et modération ;
- export RGPD, suppression/pseudonymisation du compte et gestion des
  consentements disponibles ;
- Espace Couple, saisons bilatérales, invitations liées à l’email et jeux ;
- liens Parrain/Marraine hachés, expirants et à réponse unique ;
- coach IA explicite avec garde-fous, fallback local et historique chiffré ;
- abonnement Stripe lorsque les trois paramètres checkout sont configurés.

Indisponible volontairement :

- marketplace, réservation et vérification publique de coachs humains ;
- Copilote Coach, tant qu’un consentement scoped
  relation/destinataire/finalité/version n’est pas persisté ;
- Mobile Money Flutterwave : les primitives et le catalogue XOF sont dormants,
  mais aucune route de souscription ni réconciliation d’entitlement n’est
  branchée ;
- appels audio/vidéo internes et publication des binaires App Store/Play Store.

Ces surfaces répondent explicitement `503` ou restent masquées ; elles ne sont
pas présentées comme livrées.

## Prérequis

- Node.js 20 ou plus récent ;
- pnpm 9 ou plus récent ;
- PostgreSQL, via `pnpm prisma dev`, Neon, Supabase ou une autre offre
  compatible.

## Lancer en local

```bash
pnpm install
cp .env.example .env
pnpm prisma dev
pnpm exec prisma migrate deploy
pnpm seed
pnpm dev
```

`pnpm prisma dev` tourne dans un terminal séparé et affiche l’URL locale. Le
proxy local peut nécessiter `pgbouncer=true`. Une création de migration avec
`prisma migrate dev` exige une `SHADOW_DATABASE_URL` distincte, directe et
réservée au développement ; ne jamais utiliser une base partagée ou de
production comme shadow database.

Secrets locaux :

```bash
openssl rand -base64 48
openssl rand -hex 32
```

Le premier résultat convient à `JWT_SECRET`, le second à `ENCRYPTION_KEY`.

## Configuration de production

La production refuse de démarrer avec une configuration essentielle absente ou
faible. Variables minimales :

| Variable                                             | Rôle                                         |
| ---------------------------------------------------- | -------------------------------------------- |
| `DATABASE_URL`                                       | URL PostgreSQL de l’application              |
| `JWT_SECRET`                                         | signature des sessions et HMAC internes      |
| `ENCRYPTION_KEY`                                     | clé AES-256-GCM, 64 caractères hexadécimaux  |
| `APP_URL`                                            | origine HTTPS publique, sans chemin          |
| `RESEND_API_KEY`, `EMAIL_FROM`                       | vérification email et emails transactionnels |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | rate-limit distribué atomique                |
| `CRON_SECRET`                                        | authentification des purges quotidiennes     |

Upstash est fail-closed en production : une absence ou une panne refuse les
actions protégées. Le repli mémoire borné n’existe qu’en développement et test.
Resend est intégré ; `EMAIL_FROM` doit utiliser un domaine vérifié. Aucun lien
secret n’est journalisé hors développement explicite.

Groupes optionnels :

- IA : `AI_PROVIDER` et la clé correspondante
  (`ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` ou `OPENAI_API_KEY`) ;
- Stripe : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_PREMIUM`, et éventuellement `STRIPE_PUBLISHABLE_KEY` ;
- photos : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_PHOTO_BUCKET` ;
- SMS : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_VERIFY_SERVICE_SID` ;
- push : `WEB_PUSH_EMAIL`, `WEB_PUSH_PRIVATE_KEY`,
  `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`.

Les groupes doivent être complets. Sans Supabase, l’upload photo reste masqué.
Sans Twilio, la vérification téléphone est indisponible en production. Sans
Stripe complet, aucun nouveau paiement n’est ouvert.

Avant toute mise en production, suivre le
[runbook de migrations](prisma/migrations/PROD_DEPLOY.md). Ne jamais exécuter
`pnpm seed` contre la production.

## Commandes de qualité et d’exploitation

| Commande                                             | Effet                                          |
| ---------------------------------------------------- | ---------------------------------------------- |
| `pnpm test`                                          | suite Vitest complète                          |
| `pnpm lint`                                          | ESLint, zéro avertissement autorisé            |
| `pnpm exec tsc --noEmit`                             | typage strict                                  |
| `pnpm build`                                         | client Prisma et build Next de production      |
| `pnpm e2e`                                           | parcours Playwright                            |
| `pnpm test:e2e-fixtures`                             | fixtures E2E sur base locale jetable           |
| `pnpm test:account-deletion-db`                      | effacement sur base locale jetable             |
| `pnpm test:ai-consent-db`                            | courses accord/retrait sur base locale jetable |
| `pnpm test:sensitive-consent-db`                     | retrait sensible sur PostgreSQL jetable        |
| `pnpm exec prisma validate`                          | validation du schéma                           |
| `pnpm exec prisma migrate deploy`                    | migrations pending                             |
| `pnpm backfill:agent-insights`                       | détection dry-run des insights historiques     |
| `pnpm backfill:agent-insights -- --apply`            | chiffrement explicite des insights             |
| `pnpm exec tsx scripts/backfill-alliance-answers.ts` | chiffrement des réponses Alliance historiques  |
| `pnpm backfill:blurhash`                             | variantes floutées des photos historiques      |

`prisma format` est une commande mutante : l’exécuter séparément, puis relire
son diff. Les scripts d’intégration Espace Couple et suppression de compte sont
réservés à un schéma local jetable.

Le gate CI navigateur prépare ses fixtures après `pnpm seed`, exécute les
30 scénarios métier sous Chromium et répète 9 contrôles visuels/authentifiés
non destructifs sous Firefox et WebKit : **48 exécutions** sur le bundle de
production. Il refuse le rapport si un scénario manque, est ignoré, inattendu
ou flaky. Les options
`E2E_LOCAL_MEMORY_RATE_LIMIT` et `E2E_LOCAL_INSECURE_COOKIE` sont enfermées par
CI + fixtures gérées + URL loopback et ne doivent jamais être utilisées contre
une cible distante.

## Architecture

```text
app/
  [locale]/                 pages publiques et espace authentifié
  api/                      routes REST
components/                 primitives et interfaces produit
lib/
  agents/                   assistants déterministes et garde-fous
  ai-coach/                 interaction IA explicitement déclenchée
  core-engine/              règles doctrinales YAML
  payments/                 Stripe, entitlements et rails dormants
  security/                 session, chiffrement, origine, rate-limit
prisma/
  migrations/               historique DDL canonique
  schema.prisma
rulesets/                   règles évangélique et catholique
worker/                     service worker PWA
```

### Invariants de sécurité

- Toute autorisation est décidée côté serveur et échoue fermé.
- Un espace de match sensible exige un match `ACTIVE`, l’appartenance et
  l’absence de blocage.
- Une demande `PENDING` ne divulgue pas encore le profil privé du demandeur.
- Un blocage ferme les matchs concernés et coupe messages, jeux, agents,
  photos et liens de bénédiction.
- Les transitions d’Alliance et de saison Couple utilisent consentement
  bilatéral, CAS et transactions sérialisables.
- Le service worker met API, navigations et RSC en `NetworkOnly` ; seuls les
  assets statiques sont mis en cache.
- Les uploads sont décodés puis réencodés, bornés en taille et en pixels, et
  leurs métadonnées sont supprimées.
- Les états Premium proviennent uniquement d’un webhook Stripe signé et
  réconcilié avec le client, le Price et le mode test/live attendus.

### Données et confidentialité

Les messages, réponses Alliance, notes de coach et insights sensibles sont
chiffrés au repos. Il ne s’agit pas d’E2EE : le serveur doit pouvoir appliquer
les règles de sécurité et de modération.

L’export expose un indicateur `export.complete`, les collections tronquées et
les problèmes d’intégrité rencontrés. Chaque collection est bornée à 2 000
éléments dans l’export automatique ; une demande complète peut nécessiter le
support.

La suppression efface les données propres et les objets de stockage, supprime
le Customer Stripe lorsque présent, puis pseudonymise la ligne de compte.
Certaines données de tiers, signalements ou traces légalement nécessaires
peuvent être conservées sous forme minimisée.

Documentation ciblée :

- [chiffrement des réponses Alliance](docs/security/alliance-answer-encryption.md) ;
- [intégrité de l’Espace Couple](docs/security/couple-space-integrity.md) ;
- [cycle des liens de bénédiction](docs/security/blessing-links.md) ;
- [journal d’audit administratif](docs/security/admin-audit.md).

## IA et accompagnement

Les fonctions de fond (ice-breaker, bilan, Gardien, sortie et reconstruction)
utilisent des contenus locaux déterministes et n’envoient pas les profils ou
notes à un fournisseur LLM.

Seul le coach IA explicitement sollicité peut appeler le fournisseur configuré.
Il exige auparavant le consentement autonome `AI_COACH_INTERACTION`, versionné
et lié à une empreinte serveur du fournisseur, des modèles, des opérateurs
d’inférence et de la politique de routage. Le recueil ne transmet aucune
donnée ; l’appel ne devient possible qu’après une question distincte. Avec
OpenRouter, `OPENROUTER_ALLOWED_PROVIDERS` est obligatoire : la passerelle
envoie cette allowlist exacte dans `provider.only`, désactive les fallbacks,
refuse la collecte et exige les endpoints ZDR. Tout changement de modèle,
d’opérateur ou de politique impose un nouvel accord.

L’admission consentement + quota est commitée dans une transaction courte, puis
le réseau s’exécute hors transaction sous un bail technique de 20 secondes et
une échéance globale de 15 secondes. Le retrait révoque d’abord l’autorisation,
puis attend hors connexion DB les seuls transferts déjà admis. Après sa réponse
`200`, aucune nouvelle transmission ne peut commencer sans nouvel accord.

Avant envoi, les coordonnées détectées sont expurgées. Le contexte comprend la
question, l’historique récent, l’étape, la langue, la tradition doctrinale et un
contexte culturel dérivé du pays. Sans fournisseur, un fallback local répond
sans destinataire IA externe.

Quota : cinq questions par jour pour le compte gratuit, réservé avant le départ
réseau et jamais remboursé après un timeout ; abonnement actif sans quota
quotidien. Deux rate-limits distincts bornent l’identité et l’adresse IP.
`OPENROUTER_MODEL` est un dernier recours après la matrice étape/palier.

Le périmètre, la concurrence retrait/appel et les limites d’expurgation sont
documentés dans le
[cycle de vie des données](docs/security/privacy-data-lifecycle.md).

Le Gardien du Couple produit un mot déterministe. En cas de contenu évoquant un
danger, il affiche des ressources professionnelles et pose un drapeau privé ;
aucune alerte humaine opérationnelle n’est envoyée automatiquement.

## Espace Couple et Parrain/Marraine

Les saisons suivent `ENGAGED -> MARRIED -> PARENTS`. Le premier membre demande
la transition, le second la confirme. Un utilisateur ne peut appartenir qu’à
un espace ; les contraintes PostgreSQL protègent aussi les écritures hors API.

Une invitation externe a la forme `ALLIANCE-XXXXXXXXXXXX`, possède 60 bits
d’entropie, est stockée sous HMAC, liée à l’email vérifié, expire après 72
heures et est consommée atomiquement.

Un lien de bénédiction utilise 256 bits aléatoires. Seul son SHA-256 est stocké ;
il expire après 72 heures, devient inutilisable après réponse et est révoqué
lors d’un blocage, d’une clôture ou d’un changement de sponsor.

## Paiements

Stripe Checkout, le portail client et le webhook signé sont implémentés. Un
nouveau checkout n’est proposé que si secret, Price et webhook sont tous
configurés. Le montant exact, la devise et la périodicité sont affichés par
Stripe avant confirmation ; l’interface ne les invente pas.

Premium livre actuellement :

- les échanges quotidiens illimités avec le coach IA ;
- le soutien au développement et à l’entretien du service.

Blocage, signalement, sortie, export, suppression et contrôles de
confidentialité restent gratuits à vie.

## PWA et mobile

La PWA comprend manifest, icônes, safe areas et page hors ligne. Les réponses
authentifiées ne sont jamais mises en cache. Le wrapper Capacitor charge la PWA
distante, mais aucun binaire de store n’est publié dans ce dépôt.

```bash
export CAP_SERVER_URL="https://votre-domaine.example"
pnpm cap add ios
pnpm cap add android
```

La validation réelle Safari iOS, clavier logiciel, installation PWA et stores
reste une étape manuelle sur appareils.

## Comptes de démonstration

Après `pnpm seed`, le mot de passe partagé est `Alliance2026!`.

| Email                                   | Profil                              |
| --------------------------------------- | ----------------------------------- |
| `elodie@demo.chemin-alliance.app`       | compte vérifié, match avec Jonathan |
| `jonathan@demo.chemin-alliance.app`     | compte vérifié                      |
| `marie-claire@demo.chemin-alliance.app` | profil catholique                   |
| `david@demo.chemin-alliance.app`        | profil évangélique                  |
| `sarah@demo.chemin-alliance.app`        | match avec David                    |
| `emmanuel@demo.chemin-alliance.app`     | profil catholique                   |
| `admin@chemin-alliance.app`             | administration des signalements     |

Ces identifiants sont exclusivement destinés au développement et à la recette.
