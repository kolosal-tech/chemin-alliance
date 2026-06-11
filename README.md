# Chemin d'Alliance

Plateforme web de rencontre chrétienne premium (protestante évangélique + catholique) —
**une infrastructure de discernement et d'accompagnement vers le mariage**, pas une app de dating.

Monolithe **Next.js 14** (App Router, TypeScript strict) · **PostgreSQL + Prisma** ·
**PWA installable** (iOS/Android) · 4 langues (**fr** par défaut, en, es, pt).

---

## Prérequis

- Node.js ≥ 20, pnpm ≥ 9
- Une base PostgreSQL — au choix :
  - **local sans Docker** : `pnpm prisma dev` (Prisma Postgres local, fourni)
  - Neon / Supabase (prod et dev distant)

## Lancer en local — 5 commandes

```bash
pnpm install
cp .env.example .env        # puis renseigner les 3 variables (voir ci-dessous)
pnpm prisma dev             # terminal séparé : Postgres local sans Docker
pnpm prisma migrate deploy && pnpm seed
pnpm dev                    # http://localhost:3000
```

Génération des secrets :

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY (AES-256-GCM)
```

> **Note `prisma dev`** : copier la `DATABASE_URL` affichée au démarrage dans `.env`
> et lui ajouter `&pgbouncer=true` (le proxy local ne supporte pas les prepared
> statements persistants). Sur Neon/Supabase, `pgbouncer=true` n'est nécessaire
> que si vous passez par leur pooler (port 6543 chez Supabase).
>
> **Note migrations** : sur le serveur Postgres local de `prisma dev`, utilisez
> `pnpm prisma migrate deploy` (le flux shadow-database de `migrate dev` n'y est
> pas supporté). Sur Neon/Supabase, `pnpm prisma migrate dev` fonctionne
> normalement pour créer de nouvelles migrations.

## Comptes de démo (`pnpm seed`)

Mot de passe commun : **`Alliance2026!`**

| Email | Profil |
|---|---|
| `elodie@demo.chemin-alliance.app` | Évangélique, 32 ans — match en **Discernement** avec Jonathan (conversation avec blocage de coordonnées de démo) |
| `jonathan@demo.chemin-alliance.app` | Évangélique, 34 ans |
| `marie-claire@demo.chemin-alliance.app` | Catholique, veuve, 1 enfant |
| `david@demo.chemin-alliance.app` | Évangélique, divorcé |
| `sarah@demo.chemin-alliance.app` | Pentecôtiste, parent célibataire — match en **Dialogue** avec David |
| `emmanuel@demo.chemin-alliance.app` | Catholique, veuf |
| `admin@chemin-alliance.app` | **Admin** — accès `/fr/admin/reports` |

Vérification email : en développement, le lien de vérification est **loggé dans la
console du serveur** (`[email] Lien de vérification…`). Les comptes seed sont déjà vérifiés.

Pages utiles : `/fr` (onboarding) · `/fr/design-system` (design system vivant, clair+sombre) ·
`/fr/settings/privacy` (anti-malaise, export RGPD, suppression).

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` | Développement (PWA désactivée en dev) |
| `pnpm build && pnpm start` | Production locale |
| `pnpm test` | Vitest — moteur doctrinal + blocage coordonnées (26 tests) |
| `pnpm lint` / `pnpm tsc --noEmit` | Lint / typecheck strict |
| `pnpm seed` | Peuple la démo |
| `pnpm prisma migrate deploy` | Applique les migrations |

---

## Déployer en prod (Vercel + Neon) — ~10 minutes

1. **Créer la base** sur [neon.tech](https://neon.tech) → copier la `DATABASE_URL`
   (avec `?sslmode=require`).
2. **Appliquer les migrations + seed** depuis votre machine :
   ```bash
   DATABASE_URL="postgres://...neon..." pnpm prisma migrate deploy
   DATABASE_URL="postgres://...neon..." ENCRYPTION_KEY=<votre_clef> pnpm seed   # optionnel
   ```
3. **Importer le repo sur Vercel** (framework auto-détecté : Next.js).
4. **Variables d'environnement Vercel** : `DATABASE_URL`, `JWT_SECRET`,
   `ENCRYPTION_KEY`, `APP_URL` (= URL du déploiement), et en option
   `ANTHROPIC_API_KEY` pour activer le vrai coach IA.
5. **Deploy.** La PWA est servie immédiatement : installable depuis Safari iOS
   (« Sur l'écran d'accueil ») et Chrome Android (« Installer l'application »).

Supabase fonctionne à l'identique (utiliser la connection string « Direct »
port 5432 pour les migrations ; si vous utilisez le pooler 6543, ajoutez `?pgbouncer=true`).

### Checklist sécurité avant prod

- [ ] `JWT_SECRET` et `ENCRYPTION_KEY` régénérés (jamais ceux du dev), stockés uniquement dans Vercel
- [ ] `DATABASE_URL` avec SSL (`sslmode=require`)
- [ ] `APP_URL` en https — les cookies passent en `Secure`
- [ ] Brancher un fournisseur d'email réel dans `lib/email.ts` (Resend/Postmark/SES)
- [ ] Rate-limiting : brancher Upstash/Redis dans `lib/security/rate-limit.ts` si multi-régions
- [ ] Vérifier les en-têtes (CSP, HSTS, X-Frame-Options) sur le déploiement : `curl -I https://…`
- [ ] Staging : poser `STAGING=1` pour ajouter `X-Robots-Tag: noindex`
- [ ] RGPD : DPIA recommandée (données religieuses = art. 9), registre des traitements, référent désigné

---

## Mobile iOS + Android

**v1 = PWA installable** (livrée) : manifest complet (icônes 192/512 + maskable,
`display: standalone`, portrait, thème `#131D33`), service worker Workbox avec
page hors-ligne (`/fr/offline`), méta `apple-mobile-web-app-*`, safe-areas
respectées, cibles tactiles ≥ 44 px.

**Binaires de store** (chemin câblé, non publié) : l'enveloppe Capacitor charge
la PWA déployée (`capacitor.config.ts`, `server.url`).

```bash
export CAP_SERVER_URL="https://votre-domaine.app"
pnpm cap add ios && pnpm cap add android   # génère ios/ et android/
pnpm cap open ios                          # Xcode : signer puis archiver
pnpm cap open android                      # Android Studio : générer l'AAB signé
```

La soumission App Store / Play Store demande des comptes développeurs payants et
une review — hors « déploiement en un clic ». Évolution possible : app React
Native/Expo partageant `/lib`.

---

## Architecture

```
app/
  [locale]/            # fr · en · es · pt — routing next-intl
    page.tsx           # Onboarding 3 slides
    login/ register/ offline/ design-system/
    (app)/             # Authentifié (garde par page + layout)
      suggestions/ profile/ messages/[matchId]/ alliance/[matchId]/
      coach-ai/ coaches/[id]/ settings/privacy/ admin/reports/
  api/                 # Route handlers (REST)
lib/
  core-engine/         # ⭐ Moteur doctrinal : charge les YAML, validateAction()
  moderation/          # Détection coordonnées (regex multilingues)
  ai-coach/            # Guardrails + fallback scripté + branchement LLM
  security/            # AES-256-GCM, Argon2id, JWT (jose), rate-limit, sessions
  payments/            # Interface PaymentProvider (stub — voir ci-dessous)
rulesets/              # christian_evangelical_default.yaml · christian_catholic_default.yaml
messages/              # fr.json · en.json · es.json · pt.json
prisma/                # schema + migrations + seed
```

**Règle d'or** : la messagerie, l'échange de coordonnées et les transitions
d'étape passent par `validateAction()` du moteur doctrinal. La doctrine vit dans
les YAML — jamais dans le code UI. Le message éducatif de blocage (4 langues)
vient du ruleset.

### Coach IA

- Sans clé API : **mode fallback déterministe** (réponses guidées par étape, 4 langues) — la prod tourne sans dépendance payante.
- Avec une clé : `ANTHROPIC_API_KEY` (Claude direct), **`OPENROUTER_API_KEY`**
  (n'importe quel modèle via OpenRouter — choisir avec `OPENROUTER_MODEL`,
  défaut `anthropic/claude-haiku-4.5`) ou `OPENAI_API_KEY` (gpt-4o-mini).
  Même system prompt à garde-fous spirituels dans les trois cas ; toute panne
  LLM retombe silencieusement sur le fallback scripté.
- Dans tous les cas : bandeau de transparence, jamais d'affirmation de volonté
  divine, redirection vers coach humain sur sujet sensible, quota 5 questions/jour (DB).

### Paiements

`lib/payments/provider.ts` expose `PaymentProvider` avec une implémentation
factice. Brancher Stripe = implémenter `StripePaymentProvider`
(`checkout.sessions.create` + webhook `constructEvent`) sans toucher aux appelants.
Règle non négociable : blocage, signalement, suppression de compte et
confidentialité ne passent **jamais** derrière un paywall.

---

## Décisions & hypothèses

- **Auth maison** (Argon2id via `@node-rs/argon2` + JWT `jose` en cookie httpOnly/Secure/SameSite=Lax, 7 j) plutôt que NextAuth : moins de surface, déploiement Vercel sans config supplémentaire.
- **Prisma 6** (générateur `prisma-client-js` stable). Prisma 7 changeait le générateur et exigeait des driver adapters.
- **Sans Docker ni Postgres local**, `pnpm prisma dev` fournit un Postgres local ; quirks documentés (pgbouncer, migrate deploy).
- **Anti-Malaise Local v1** : exclusion même ville approximative + même dénomination (proxy raisonnable sans géolocalisation fine). Le rayon est stocké et l'algorithme est isolé dans `lib/matching.ts` pour brancher une vraie géo plus tard. La raison d'exclusion n'est jamais exposée.
- **Messages chiffrés au repos** (AES-256-GCM applicatif), comme témoignage, église locale et vision familiale. Pas de E2EE en v1 (la modération des coordonnées doit lire le contenu côté serveur).
- **Avancement d'étape à double consentement** : le premier demande, le second confirme ; les `required_checks` du ruleset sont évalués à la confirmation. Un signalement actif bloque.
- **Messages bloqués** : stockés `BLOCKED`, visibles uniquement par l'expéditeur (barrés), accompagnés d'un message SYSTÈME éducatif issu du moteur — jamais une erreur technique.
- **Rate-limit en mémoire** (fenêtre glissante) : suffisant en v1 single-region ; interface prête pour Redis.
- **Email transactionnel** : lien de vérification loggé en dev ; interface `lib/email.ts` stable pour brancher Resend/SES en prod.
- **Capacitor** en mode « remote wrapper » (charge la PWA déployée) : l'app Next.js est SSR full-stack, pas exportable en statique.
- **Stubs propres documentés** : Stripe réel, stores iOS/Android (publication), appels audio/vidéo internes, vertical multi-religions supplémentaires, espace église — hors périmètre v1, aucune erreur à l'exécution.
- **Husky non installé** (chaîne CI conseillée : `pnpm lint && pnpm tsc --noEmit && pnpm test`).

## Tests

`pnpm test` — 26 tests Vitest, dont les tests d'intégration exigés :
moteur doctrinal (blocage téléphone en Découverte, message éducatif localisé,
checks d'avancement, ruleset invalide/path traversal) et détection de
coordonnées (`+33…`, `06 12 34 56 78`, emails, `@handle`, « zéro six »,
WhatsApp/Insta, liens — et **Jean 3:16 n'est pas bloqué**).
