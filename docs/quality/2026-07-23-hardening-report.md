# Rapport de durcissement et de validation — 23 juillet 2026

## Verdict

Le périmètre local exercé ne contient plus d’échec connu : installation
reproductible, schéma, types, lint, format, **752 tests Vitest**, audit des
dépendances de production, build de production, **26 migrations** sur
PostgreSQL 16 frais, courses réelles de consentement, **48 exécutions E2E
Chromium/Firefox/WebKit sans skip** et revue visuelle Browser sont verts.

Ce résultat ne constitue toutefois pas une preuve absolue de « zéro bug » ou
de fiabilité à 100 %. Les intégrations externes sans identifiants réels, les
navigateurs/appareils non disponibles et les fonctionnalités volontairement
désactivées restent explicitement hors du périmètre prouvé.

## Périmètre inspecté

- Documentation produit, README, runbooks de migration et contrats légaux.
- 78 routes API et leurs contrôles d’accès, concurrence, validation et erreurs.
- Authentification, sessions, CSRF, rate limiting, e-mail, téléphone et push.
- Matching, messagerie, signalements, blocages, jeu, espace couple et parrainage.
- Données sensibles, export, suppression, chiffrement et journaux d’audit.
- Paiement Stripe, droits Premium et comportement sans fournisseur configuré.
- IA, garde-fous, minimisation des données et consentement.
- PWA, service worker, cache, en-têtes HTTP, CSP et déconnexion.
- Affichage public/authentifié, thèmes clair/sombre, quatre langues et responsive.
- Schéma Prisma, historique des migrations, seed et scripts de backfill.

## Modifications livrées

L’inventaire exhaustif des 346 chemins finaux est conservé dans
`docs/quality/2026-07-23-file-inventory.txt`. Les groupes ci-dessous donnent
les fichiers structurants ; l’inventaire fait foi pour la liste complète.

### Sécurité et authentification

- `middleware.ts`, `next.config.mjs`
- `lib/security/jwt.ts`, `lib/security/password.ts`
- `lib/security/rate-limit.ts`, `lib/security/request-origin.ts`
- `lib/security/safe-error.ts`, `lib/security/json-ld.ts`, `lib/audit.ts`
- `app/api/auth/**`, `app/api/blocks/route.ts`
- `tests/jwt.test.ts`, `tests/password.test.ts`
- `tests/rate-limit.test.ts`, `tests/request-origin.test.ts`
- `tests/security-headers.test.ts`, `tests/safe-error.test.ts`
- `tests/json-ld.test.ts`
- `tests/api-auth-boundary.test.ts`

Durcissements principaux :

- JWT limités à HS256 avec issuer, audience et version de session.
- Comparaison Argon2 factice contre l’énumération des comptes.
- Protection CSRF same-origin tenant compte du Host réellement demandé.
- Protection CSRF maintenue sur l’upload photo multipart ; seule sa limite de
  taille spécifique remplace le plafond global réservé aux petits bodies.
- Flux multipart photo compté avant parsing, indépendamment d’un
  `Content-Length` absent ou mensonger ; dépassement 413 et format invalide 400
  avant stockage objet ou mutation de base.
- Bodies JSON optionnels distinguant absence réelle, JSON invalide et dépassement
  de taille ; aucune mutation sensible ne poursuit sur une charge invalide.
- Redis atomique par Lua, obligatoire et fail-closed en production.
- CSP sans `unsafe-eval` en production, `object-src 'none'` et protections
  HSTS, nosniff, anti-frame, permissions et referrer.
- Réponses API privées/no-store, y compris les sorties anticipées 401/429.
- Liens bearer de bénédiction, reset segmenté/query et vérification email
  privés, non indexables, non mis en cache et sous `Referrer-Policy: no-referrer`.
- Journal de méditation local isolé par compte sur les appareils partagés,
  ancienne clé globale ambiguë purgée et effacement autonome confirmé ; la
  suppression du compte efface aussi ce stockage local.
- Journal d’administration pseudonymisé par HMAC et erreurs fournisseurs
  nettoyées avant journalisation.
- JSON-LD éditorial sérialisé sans délimiteurs HTML : `</script>`, chevrons,
  esperluette et séparateurs Unicode ne peuvent pas sortir de la balise script.
- Barrière d’architecture exhaustive : toute nouvelle route API doit importer et
  appeler un garde de session, sauf exception publique ou machine explicitement
  recensée ; les routes d’administration exigent toujours `requireAdmin`.

### Autorisation, matching et messagerie

- `lib/matching.ts`, `lib/blocks.ts`, `lib/block-response.ts`
- `lib/contact-exchange.ts`, `lib/reports.ts`, `lib/safety-signals.ts`
- `lib/suggestion-profile.ts`, `lib/alliance.ts`
- `app/api/matches/**`, `app/api/reports/route.ts`
- `app/[locale]/(app)/messages/[matchId]/conversation.tsx`
- `tests/match-access.test.ts`, `tests/match-decision-routes.test.ts`
- `tests/message-block-access.test.ts`, `tests/reports*.test.ts`

Durcissements principaux :

- Accès centralisé aux relations actives, membres autorisés et utilisateurs
  non bloqués.
- Décisions, acceptations, clôtures, échanges de contact et signalements
  atomiques avec transactions et compare-and-set.
- Suggestions limitées aux profils actifs et DTO public sans données privées.
- Blocage bilatéral et révocation immédiate des accès associés.
- Signalements rattachés à une rencontre vérifiée ou marqués historiques.
- Jeu hydraté sans clic perdu, attente métier E2E et sélecteurs non ambigus.

### Vie privée, RGPD et données sensibles

- `lib/account-export.ts`, `lib/account-deletion.ts`
- `lib/privacy-settings.ts`, `lib/profile-photo.ts`
- `lib/sensitive-data-consent-scope.ts`, `lib/sensitive-data-consent.ts`
- `lib/legal/consent-scope.ts`, `lib/legal/content.ts`
- `lib/alliance-answer.ts`, `lib/agent-insight.ts`
- `lib/payments/stripe-erasure.ts`, `lib/storage.ts`
- `app/api/me/**`, `app/api/photos/[userId]/view/route.ts`
- `docs/security/privacy-data-lifecycle.md`
- `docs/security/alliance-answer-encryption.md`
- `tests/account-export.test.ts`, `tests/account-deletion.test.ts`
- `tests/privacy-settings.test.ts`, `tests/stripe-erasure.test.ts`

Durcissements principaux :

- Export sous transaction repeatable-read, champs autorisés explicitement,
  secrets exclus, valeurs sensibles déchiffrées pour la personne concernée et
  collections plafonnées avec indicateur de troncature.
- Suppression fail-closed : photos Supabase, client Stripe et données locales
  sont traités avant confirmation ; le compte est pseudonymisé et invalidé.
- Réponses d’Alliance et insights d’agents chiffrés avec backfills contrôlés.
- Upload photo décodé/réencodé, métadonnées supprimées, limites, MIME et
  signatures binaires vérifiés.
- Textes légaux alignés sur la pseudonymisation, les rétentions, l’export et
  les sous-traitants réellement configurables.
- Inscription, seed et réactivation écrivent le même périmètre de consentement
  sensible versionné, avec finalité et destinataire définis côté serveur.
- L’acceptation des CGU enregistre leur version datée, leur finalité et leur
  destinataire ; les cases natives obligatoires nomment CGU, charte et retrait.
- Politiques publiques et variantes régionales fr/en/es/pt décrivent la commande
  autonome réelle, la suspension des traitements et la suppression séparée.

### Espace couple, parrainage et intégrité de base

- `lib/couple-space.ts`, `lib/blessing.ts`, `lib/sponsor.ts`
- `app/api/couple/**`, `app/api/blessing/[token]/route.ts`
- `prisma/schema.prisma`, `prisma/seed.ts`
- `prisma/migrations/0016a_sponsor_companions/migration.sql`
- `prisma/migrations/0020_photo_blurhash/migration.sql`
- `prisma/migrations/0021_contact_exchange_requester/migration.sql`
- `prisma/migrations/0022_alliance_answer_encryption/migration.sql`
- `prisma/migrations/0023_couple_space_integrity/migration.sql`
- `prisma/migrations/0024_blessing_token_hardening/migration.sql`
- `docs/security/couple-space-integrity.md`
- `docs/security/blessing-links.md`

Durcissements principaux :

- Invariants base de données sur membres, rencontre, saison et espace couple.
- Clés étrangères RESTRICT là où une suppression silencieuse casserait
  l’historique, avec ordre de purge explicite.
- Invitations couple HMAC, liées à l’e-mail, 60 bits et durée de 72 heures.
- Liens de bénédiction jamais stockés en clair : SHA-256, expiration 72 heures,
  consommation atomique, révocation et en-têtes privés.
- Seed reproductible par identité canonique et réinitialisation explicite du
  mot de passe de démonstration.

### Paiement, fournisseurs et environnement

- `lib/payments/provider.ts`, `lib/payments/stripe-webhook.ts`
- `lib/payments/redirect.ts`
- `lib/payments/entitlements.ts`, `lib/payments/stripe-erasure.ts`
- `app/api/billing/**`, `app/api/webhooks/stripe/route.ts`
- `lib/env.ts`, `.env.example`, `README.md`
- `lib/email.ts`, `lib/sms.ts`, `lib/push.ts`
- `tests/stripe-*.test.ts`, `tests/premium-honesty.test.ts`
- `tests/env.test.ts`, `tests/email-security.test.ts`, `tests/phone-route.test.ts`

Durcissements principaux :

- Checkout, portail, signature webhook, idempotence et réconciliation Stripe.
- Redirections checkout/portail validées côté fournisseur et navigateur :
  HTTPS obligatoire, surface Stripe exacte et aucun credential dans l’URL.
- Droits Premium issus uniquement d’un état Stripe vérifié.
- État UI honnête lorsque Price, marketplace, téléphone ou fournisseur manque.
- Production refusée sans Redis, Resend, adresse expéditrice et secret cron.
- Échec e-mail remonté en 502 ; téléphone en 503 avant mutation sans Twilio.
- Secrets faibles, URLs incohérentes et paires de configuration incomplètes
  rejetés au démarrage.

### IA et minimisation

- `lib/ai-coach/consent.ts`, `lib/ai-coach/guardrails.ts`
- `lib/llm/deadline.ts`, `lib/llm/gateway.ts`, `lib/llm/scope.ts`
- `lib/agents/**`, `lib/llm/matrix.ts`
- `app/api/agents/**`, `app/api/ai-coach/message/route.ts`
- `app/api/me/consents/ai-coach/route.ts`
- `prisma/migrations/0025_ai_coach_consent/migration.sql`
- `scripts/validate-ai-coach-consent-linearization.ts`
- `tests/ai-coach-*.test.ts`, `e2e/ai-coach-consent.spec.ts`
- `tests/agents.test.ts`, `tests/llm-background-privacy.test.ts`
- `tests/guardian-checkin-privacy.test.ts`
- `tests/ice-breaker-privacy.test.ts`

Durcissements principaux :

- Détection/expurgation de données identifiantes et garde-fous relationnels.
- Tâches d’arrière-plan déterministes sans profil ni notes personnelles envoyés
  à un LLM.
- Consentement Coach IA exact, versionné et révocable, lié à l’empreinte du
  fournisseur, des modèles, des opérateurs d’inférence et de la politique de
  routage.
- Admission atomique sous verrou consultatif, puis appel réseau hors
  transaction ; baux de transfert courts et révocation linéarisée.
- Quota gratuit réservé durablement avant tout appel susceptible d’atteindre le
  fournisseur ; un timeout ne rembourse jamais un transfert potentiellement
  transmis.
- OpenRouter fermé sans liste d’opérateurs explicite ; routage limité avec
  `only`, fallback désactivé, collecte refusée et ZDR exigé.
- Deadline globale de 15 secondes contrôlée avant admission, après verrou et
  avant persistance.
- Copilote coach fermé en 503 tant qu’un consentement scoped, versionné et
  révocable n’existe pas.
- Gardien déterministe, sans fausse promesse d’alerte humaine opérationnelle.
- Consentement général sensible révocable depuis Confidentialité, verrouillé
  côté serveur et retiré bilatéralement de toutes les surfaces relationnelles.

### Chaîne qualité et dépendances

- `.github/workflows/quality.yml`, `.github/dependabot.yml`
- `scripts/assert-playwright-results.mjs`
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `playwright.config.ts`, `vitest.config.ts`

Durcissements principaux :

- Deux jobs CI séparés : qualité statique/unitaire/build et matrice
  Chromium/Firefox/WebKit sur PostgreSQL 16.
- Gate navigateur déterministe refusant tout scénario manquant, ignoré,
  inattendu ou flaky.
- Cookie HTTP local autorisé uniquement avec les trois verrous CI, fixture
  géré et opt-in explicite, et seulement sur une URL loopback.
- Versions transitives vulnérables forcées vers leurs correctifs ; Sharp mis à
  jour ; audit de production ramené de 10 vulnérabilités à zéro connue.

### PWA, interface et accessibilité

- `worker/index.ts`, `lib/pwa-cache.ts`, `public/sw.js`
- `components/AccessibleDialog.tsx`, `components/BottomNav.tsx`
- `components/game/GamePanel.tsx`, `components/LogoutButton.tsx`
- `app/[locale]/login/login-form.tsx`
- `app/[locale]/page.tsx`, `app/globals.css`, `tailwind.config.ts`
- `messages/fr.json`, `messages/en.json`, `messages/es.json`, `messages/pt.json`
- `e2e/couple-game.spec.ts`, `e2e/couple-settings-glass.spec.ts`
- `e2e/ux-batch-fixes.spec.ts`, `tests/pwa-cache.test.ts`
- `tests/devotional-cron-route.test.ts`
- `tests/push-consent.test.ts`

Durcissements principaux :

- API, navigations, documents et RSC en `NetworkOnly`; seuls les assets
  statiques utilisent `CacheFirst`.
- Pagination stable du cron Push : la purge d’abonnements invalides pendant
  l’envoi ne peut plus déplacer les pages et faire sauter des membres.
- Notifications fermées après retrait : le cron ne sélectionne que les
  consentements sensibles actifs et la fonction Push revalide le destinataire
  avant de lire tout abonnement.
- Purge des caches applicatifs lors de la déconnexion.
- Dialogue accessible avec focus initial, boucle de focus, restauration et Échap.
- Safe areas, barre basse, bouton de déconnexion et conversation sans recouvrement.
- Questions suggérées en cartes flex non rétrécissables, lisibles et scrollables.
- Barre basse entièrement lisible en fr/en/es/pt à 320 px.
- En-tête conversation sur deux rangées sous 360 px sans tronquer le prénom.
- Suppression des statistiques, témoignages, presse et prix non vérifiés.

## Validations exécutées

### Validation statique et unitaire finale

```text
pnpm exec prisma format      -> succès
pnpm exec prisma validate    -> schéma valide
pnpm exec prisma generate    -> Prisma Client 6.19.3 généré
pnpm exec tsc --noEmit       -> succès
pnpm lint                    -> succès, 0 avertissement
pnpm test                    -> 109 fichiers, 752 tests passés
pnpm audit --prod            -> aucune vulnérabilité connue
git diff --check             -> succès
prettier --check             -> tous les fichiers source modifiés conformes
```

### Base de données et migrations

- Base PostgreSQL locale isolée et vide.
- Migrations `0001` à `0025` appliquées dans l’ordre : succès.
- Diff base migrée vers `prisma/schema.prisma` : `No difference detected`.
- Seed complet : succès.
- Suppression de compte réelle sur la base isolée :
  `ACCOUNT_DELETION_INTEGRATION_OK`.
- Linéarisation du consentement IA sur PostgreSQL 16 standard :
  - transfert admis puis révocation : succès ;
  - révocation avant nouveau transfert : succès ;
  - révocation gagnante contre grant concurrent : succès ;
  - quota dépassé sans fournisseur : succès ;
  - timeout fournisseur avec quota durable : succès ;
  - résultat final : `AI_COACH_CONSENT_LINEARIZATION_INTEGRATION_OK`.
- Retrait général sensible sur PostgreSQL 16 standard :
  - masquage immédiat du profil et révocation des consentements dépendants ;
  - accès bilatéraux Match et Espace Couple retirés puis restaurés ;
  - huit réactivations simultanées convergent vers une seule ligne active ;
  - retraits répétés idempotents avec une seule barrière durable ;
  - résultat final : `SENSITIVE_DATA_CONSENT_INTEGRATION_OK`.
- Backfills AllianceAnswer et AgentInsight : dry-run/apply/dry-run sans reste.
- Service PostgreSQL temporaire arrêté à la fin de la validation.

### Build de production

```text
pnpm run build
```

Résultat :

- Next.js 15.5.21 compilé avec succès dans le gate E2E exact.
- 221 pages générées.
- Types et lint du build validés.
- `public/sw.js`, Workbox et worker personnalisé générés.
- Vérification déterministe du worker :
  - API : `NetworkOnly`;
  - navigation/document/RSC : `NetworkOnly`;
  - `/_next/static` : `CacheFirst`;
  - fallback hors ligne présent.
- Seuls subsistent les avertissements de cache Webpack liés à l’import dynamique
  interne de `next-intl`; aucun échec de build.

### E2E mobile Chromium, Firefox et WebKit

Gate final exécuté sur le bundle de production, PostgreSQL 16 jetable et
fournisseur IA déterministe :

- **48 passés, 0 ignoré, 0 inattendu, 0 flaky** ;
- gate intégral reconstruit et rejoué après la canonisation des consentements,
  la correction Push et l’alignement des textes légaux ;
- les 30 scénarios métier des huit specs sont exécutés sous Chromium ;
- 9 contrôles visuels/authentifiés non destructifs sont répétés sous Firefox
  puis WebKit : espace couple, réglages, déconnexion et vitrine Liquid Glass ;
- consentement IA : affichage 320×568 en quatre langues, accord sans body,
  message, retrait et verrou serveur ;
- inscription : consentements sensibles/CGU visibles à 320×568 en quatre
  langues, obligatoires nativement, liens juridiques corrects et sans overflow ;
- quatre profils (célibataires, fiancés, mariés), portrait BlurHash, Watchman et
  état paiement honnête sans fournisseur ;
- jeu humain-humain, messagerie couple, réglages et déconnexion ;
- Liquid Glass : six contrôles visuels/accessibilité ;
- coaches et Coach IA : quatre langues ;
- page de confiance et anti-double-clic devotionnel ;
- `assert-playwright-results.mjs 48` : succès ;
- autotest du gate : rapport valide accepté et huit rapports invalides rejetés.

### Revue visuelle Browser

- Pages : accueil, connexion, suggestions, coaches, premium, confidentialité,
  dialogue de suppression et conversation.
- Viewports : 320×568, 360×800, 390×844 et 1440×900.
- 24 combinaisons route/viewport sans débordement horizontal.
- Thèmes clair et sombre inspectés.
- Navigation fr/en/es/pt vérifiée à 320 px sans texte tronqué.
- Suggestions de conversation : `scrollWidth === clientWidth` et
  `scrollHeight === clientHeight` pour chaque carte.
- Dialogue de suppression : focus interne, scroll arrière-plan bloqué, Échap
  fonctionnel et focus restaurable.
- Console après toute la matrice : 0 erreur, 0 avertissement.

### Smoke HTTP du build exact

- `/fr` : 200, HSTS, CSP sans `unsafe-eval`, `object-src 'none'`.
- `/fr/parrain/invalid-token` : 200, no-store, no-referrer, noindex.
- `/fr/reset-password/invalid-token` et l’ancien `?token=` : 200, no-store,
  no-referrer, noindex, noarchive.
- `POST /api/me/photo`, `/api/auth/logout` et `/api/me` avec origine intersite :
  403 `CROSS_SITE_REQUEST_REJECTED` sur le bundle de production.
- `/api/me/export` sans session : 401, private/no-store, noindex.
- `/api/blessing/invalid-token` sans Redis joignable : 429 fail-closed,
  private/no-store.

## Erreurs rencontrées et corrections

| Erreur observée                                             | Cause                                                                  | Correction et re-test                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Build refusé avec une clé de chiffrement factice répétitive | Validation d’entropie active                                           | Clé de validation haute entropie ; build repassé                                  |
| React non hydraté en développement                          | CSP production appliquée à React Refresh                               | `unsafe-eval` limité au développement ; production recontrôlée sans               |
| Login 403 entre `localhost` et `127.0.0.1`                  | Origine Next normalisée différente du Host réel                        | Origine cible dérivée du Host/protocole validés ; E2E passé                       |
| Navigation annulée après login                              | `router.push` et `router.refresh` concurrents                          | `router.replace` unique ; E2E multilingue passé                                   |
| Clic « Jouer » perdu avant hydratation                      | Bouton SSR interactif trop tôt                                         | Bouton désactivé jusqu’à hydratation ; parcours jeu passé                         |
| Tests jeu instables                                         | `networkidle`, balise `main`, état asynchrone et sélecteur global      | Attentes DOM/métier et formulaire scoped ; test passé                             |
| Chevauchement des questions suggérées                       | Items flex rétrécissables, texte non contenu                           | Cartes `flex-none`, largeur mobile, wrap et snap ; Browser/E2E passés             |
| Libellés de barre basse ellipsés                            | Six onglets et padding à 320 px                                        | Typographie/padding responsive ; quatre langues sans troncature                   |
| Prénom tronqué à 320 px                                     | Trois actions tactiles sur une seule rangée                            | En-tête sur deux rangées sous 360 px ; prénom complet                             |
| Suppression DB : prepared statements dupliqués              | Pool local non configuré PGBouncer                                     | `pgbouncer=true` pour l’intégration                                               |
| Nettoyage du test bloqué par les FK RESTRICT                | Ordre de purge incompatible avec les invariants                        | CoupleSpace/Match supprimés avant User ; intégration passée                       |
| Service PostgreSQL local arrêté entre lots                  | Processus temporaire non persistant                                    | Redémarrage contrôlé avant chaque lot, preuve finale conservée                    |
| Chromium refusé par la sandbox macOS                        | Mach rendezvous interdit                                               | Playwright relancé avec autorisation hors sandbox                                 |
| Regex invalide dans l’inspection du worker                  | Échappement de commande erroné                                         | Contrôle par positions de chaînes, résultat vert                                  |
| Verrou PostgreSQL retourné en pseudo-type `void`            | Prisma refusait de désérialiser `pg_advisory_xact_lock`                | Requête ramenée à un booléen supporté ; cinq courses réelles passées              |
| Émulateur Prisma indisponible sous concurrence              | Pool local inadapté aux attentes sur verrous consultatifs              | Validation déplacée sur PostgreSQL 16 standard jetable ; intégration passée       |
| Cookie de session absent dans le gate production HTTP       | Cookie `Secure` correctement rejeté par Chromium sur loopback HTTP     | Dérogation triple-verrou et loopback uniquement ; tests négatifs + 47 E2E passés  |
| Bouton Coach IA masqué à 320×568                            | Carte active trop haute et barre basse fixe                            | Zone active bornée/scrollable et composeur non rétrécissable ; E2E passé          |
| Jeu inaccessible avec alerte et suggestions ouvertes        | Alerte/jeu hors scroller, composeur mobile trop haut                   | Scroller conversationnel commun et extras du composeur bornés ; parcours passé    |
| Connexions E2E refusées en fin de matrice                   | Toutes les specs consommaient le même quota IP                         | IP documentaires séparées par famille et moteur ; 48/48                           |
| Navigation annulée sous Firefox/WebKit après connexion      | Redirection intermédiaire `/suggestions` avant la cible `/couple`      | Attente de la destination métier finale ; 9/9 ciblés puis 48/48                   |
| Second message Watchman bloqué                              | Le test réécrivait pendant la requête précédente                       | Attente de la réponse POST et du champ vidé ; ciblé puis matrice complète passée  |
| Build de banc refusé avant E2E                              | Valeurs Resend/cron factices détectées comme faibles                   | Valeurs aléatoires de test conformes ; build puis 48/48 sur bundle production     |
| Réactivations sensibles simultanées en conflit              | Transactions sérialisables PostgreSQL concurrentes (`P2034`)           | Retry borné après verrou consultatif ; intégration réelle puis 48/48              |
| Fixture Coach IA redirigée vers Confidentialité             | Le compte isolé ne possédait pas le consentement général               | Consentement général explicite conservé ; ciblé 1/1 puis matrice 48/48            |
| Fixture couple non idempotente                              | `upsert` déclenchait le trigger `BEFORE INSERT` avant le conflit       | Lecture transactionnelle puis update/create ; deux relances successives           |
| Membres sautés par le cron Push                             | Pagination `skip` déplacée par la purge d’abonnements invalides        | Curseur monotone sur l’identifiant ; scénario 201 membres passé                   |
| Rappel Push possible après retrait global                   | Sélection cron et envoi central sans filtre de consentement            | Double filtre destinataire actif ; tests cron et Push passés                      |
| Consentement d’inscription sans dimensions                  | Création limitée au seul type historique                               | Périmètre canonique partagé version/finalité/destinataire ; tests passés          |
| Textes légaux annonçant l’absence de retrait autonome       | Documentation antérieure à la nouvelle interface                       | Base et régimes fr/en/es/pt corrigés ; test inversé contre l’ancienne affirmation |
| Preuve CGU non versionnée et libellé réduit à la charte     | `TERMS_OF_SERVICE` sans dimensions ni acceptation textuelle des CGU    | Version datée et libellés fr/en/es/pt explicites ; tests passés                   |
| Premier lancement E2E refusé sur le port 3000               | Port Next par défaut déjà occupé par un processus extérieur au banc    | Processus préservé ; `PORT=3011`, build puis matrice 48/48 réussis                |
| JSON-LD capable de fermer sa propre balise script           | `JSON.stringify` injecté sans neutralisation du contexte HTML          | Sérialiseur central échappé et round-trip JSON ; 2 tests ciblés passés            |
| Navigation paiement suivant toute URL renvoyée              | URL fournisseur affectée directement à `window.location.href`          | Allowlist HTTPS checkout/portail, double garde serveur/client ; 10 tests ajoutés  |
| Token reset exposé au cache et au Referer même origine      | En-têtes bearer appliqués uniquement aux liens de bénédiction          | Politique étendue aux deux formats reset et vérification email ; smoke HTTP vert  |
| Réflexion locale visible entre comptes sur appareil partagé | Clé `localStorage` globale, sans propriétaire ni effacement autonome   | Clé isolée par compte, ancienne donnée purgée, effacement UI/compte ; 7 tests     |
| Upload photo multipart exempté de la garde CSRF             | Retour anticipé du middleware destiné à éviter le plafond JSON         | CSRF séparé du plafond ; test middleware et smoke HTTP intersite à 403            |
| Multipart chunked non borné avant `formData()`              | Contrôle du fichier après buffering et confiance dans `Content-Length` | Comptage réel du flux avant parsing ; 400/413 contrôlés, zéro mutation            |
| JSON invalide assimilé à un body absent                     | `catch(() => ({}))` sur des mutations optionnelles                     | Parser optionnel strict ; seul le body vide devient `null`, tests ciblés          |
| 10 vulnérabilités, dont 7 élevées                           | Versions transitives PWA/build et Sharp vulnérables                    | Overrides vers versions corrigées, verrou régénéré ; audit final à zéro connue    |
| Binaires `node_modules/.bin` absents                        | Deux reconstructions interrompues puis commandes paquet concurrentes   | Dossier généré reconstruit depuis le lock ; validations ensuite séquentielles     |

## Limites restantes

1. Les appels réels Stripe, Supabase Storage, Upstash Redis, Resend, Twilio,
   Web Push et fournisseurs LLM ne sont pas prouvés sans secrets et comptes de
   test externes. Le code est testé par doubles, contrats et modes fail-closed.
2. Le marketplace coach, les appels, Flutterwave/Mobile Money et le copilote
   coach sont volontairement indisponibles tant que leurs contrats opérationnels
   ou consentements manquent.
3. L’export automatisé plafonne chaque collection à 2 000 éléments et signale
   toute troncature ; un export support est nécessaire au-delà.
4. La CSP conserve `unsafe-inline`. La suppression exige une architecture
   nonce/hash couvrant Next.js, les styles et les scripts.
5. Les journaux d’administration sont protégés et structurés, mais aucun SIEM
   externe ni chaîne d’agrégation n’a été configuré dans ce dépôt.
6. L’audit automatisé ne garantit pas l’absence de vulnérabilité inconnue ou
   non publiée ; il prouve seulement zéro avis connu au moment de l’exécution.
7. Playwright couvre Chromium, Firefox et WebKit. Cela ne remplace pas une
   revue sur Safari/Firefox installés par des utilisateurs, lecteurs d’écran
   physiques ni appareils mobiles réels.
8. Aucune validation juridique par un conseil externe n’a été réalisée.
9. Aucune production réelle n’a été déployée ou modifiée pendant cette mission.

## Commandes de reproduction

```bash
cd /Users/mskolosalgmail.com/Developer/saas/chemin-alliance/app

pnpm install --frozen-lockfile
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm audit --prod
git diff --check

pnpm exec prisma migrate deploy
pnpm seed
E2E_MANAGED_FIXTURES=1 pnpm test:e2e-fixtures
pnpm test:account-deletion-db
pnpm test:ai-consent-db
pnpm test:sensitive-consent-db

CI=true \
APP_URL=http://127.0.0.1:3007 \
BASE_URL=http://127.0.0.1:3007 \
E2E_MANAGED_FIXTURES=1 \
E2E_LOCAL_MEMORY_RATE_LIMIT=1 \
E2E_LOCAL_INSECURE_COOKIE=1 \
AI_PROVIDER=fallback \
E2E_EMAIL=jonathan@demo.chemin-alliance.app \
E2E_MATCH_EMAIL=jonathan@demo.chemin-alliance.app \
E2E_COUPLE_EMAIL=emmanuel@demo.chemin-alliance.app \
E2E_PASSWORD='Alliance2026!' \
PROFILE_ENGAGED_EMAIL=david@demo.chemin-alliance.app \
PROFILE_MARRIED_EMAIL=emmanuel@demo.chemin-alliance.app \
WATCHMAN_EMAIL=sarah@demo.chemin-alliance.app \
pnpm exec playwright test --workers=1
node scripts/assert-playwright-results.mjs 48

NODE_ENV=production \
DATABASE_URL='<postgres-direct-url>' \
JWT_SECRET='<strong-random-secret>' \
ENCRYPTION_KEY='<64-hex-chars>' \
APP_URL='https://example.invalid' \
RESEND_API_KEY='<resend-key>' \
EMAIL_FROM='Chemin Alliance <no-reply@example.invalid>' \
UPSTASH_REDIS_REST_URL='<redis-url>' \
UPSTASH_REDIS_REST_TOKEN='<redis-token>' \
CRON_SECRET='<strong-random-secret>' \
pnpm run build
```

Pour obtenir à tout moment l’inventaire exact de l’arbre de travail :

```bash
git status --short
```
