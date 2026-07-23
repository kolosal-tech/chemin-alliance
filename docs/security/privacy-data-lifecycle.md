# Cycle de vie des données et limites publiques

État vérifié dans le code au 23 juillet 2026. Ce document décrit le produit ; il ne remplace pas une validation juridique.

## Export

- L'export en libre-service est borné à 2 000 éléments par collection (`EXPORT_COLLECTION_LIMIT`).
- Le JSON expose `export.complete`, `export.collectionLimit` et `export.collections`.
- Chaque consentement exporté inclut son type, sa version, sa finalité, son destinataire, sa date d'octroi et, le cas échéant, sa date de retrait.
- Si une collection dépasse la borne, `export.complete` vaut `false` et son entrée dans `export.collections` indique `truncated: true`, le nombre exporté et la limite.
- Une demande d'accès ou de portabilité dépassant cette borne doit être adressée à `alliance@kolosaltech.com`.

## Suppression du compte

- Les données propres au membre sont effacées : profils, contenus envoyés, réponses, productions IA, consentements, moyens de contact, appareils Push et identifiant de paiement rattaché au compte.
- La ligne du compte est conservée sous une identité pseudonymisée afin de ne pas supprimer par cascade les contenus appartenant à des tiers.
- Les contenus des tiers, les signalements et les traces nécessaires à la sécurité, à une obligation applicable ou à la défense de droits peuvent subsister avec un accès limité.
- Les signalements sont purgés au plus tard 365 jours après leur création.

## Consentements

- Le consentement général au traitement des données sensibles est recueilli à
  l'inscription et reste révocable depuis Confidentialité.
- Le consentement distinct `AGENT_PROFILING` reste révocable directement dans l'interface Préparation.
- Le Coach IA interactif utilise un consentement autonome `AI_COACH_INTERACTION`, révocable sans supprimer le compte depuis l'écran Coach IA.

`GET|POST|DELETE /api/me/consents/sensitive-data` expose, recueille et retire
ce consentement sans accepter de périmètre choisi par le client. Le retrait :

- révoque le consentement général et les consentements dépendants ;
- masque le profil via `invisibleMode` ;
- bloque globalement les pages et API métier avec HTTP 428 ;
- retire le consentement Coach IA et attend les transferts déjà admis ;
- retire bilatéralement le profil des suggestions, rencontres, conversations,
  photos et espaces couple ;
- exclut le membre des rappels planifiés et empêche la fonction Push centrale de
  lire ses abonnements, y compris si un envoi métier avait déjà été préparé ;
- conserve accessibles la réactivation, l'export, l'effacement et la
  déconnexion.

Le recueil/retrait est sérialisé par verrou consultatif PostgreSQL, possède une
barrière de retrait contre un POST ancien en vol et rejoue les conflits P2034
de façon bornée. Les lignes historiques restent exportables.

## Coach IA

### Autorisation fail-closed

Le périmètre courant est défini uniquement côté serveur dans `lib/ai-coach/consent.ts` :

- type : `AI_COACH_INTERACTION` ;
- version : `ai-coach-interactive-2026-07-23.v3` ;
- finalité : `INTERACTIVE_DISCERNMENT_SUPPORT` ;
- destinataire : empreinte `sha256:` du fournisseur, des modèles, des opérateurs
  d'inférence autorisés et de la politique de routage effective.

La route `POST /api/me/consents/ai-coach` ne lit aucun corps et n'appelle aucun fournisseur. Elle enregistre seulement ce périmètre canonique, avec `grantedAt`. Le client ne peut choisir ni la version, ni la finalité, ni le destinataire.

Pour OpenRouter, `OPENROUTER_ALLOWED_PROVIDERS` est obligatoire. L'empreinte
couvre toute la matrice chargée, son modèle de dernier recours, les opérateurs
d'inférence explicitement configurés et la politique
`only + allow_fallbacks=false + data_collection=deny + zdr=true`. Une
modification de `LLM_MATRIX_JSON`, de `OPENROUTER_MODEL`, du fournisseur, d'un
modèle, d'un opérateur ou de cette politique change automatiquement l'empreinte
et impose un nouvel accord. Les éditeurs déduits des slugs de modèles ne sont
pas présentés comme destinataires : seul l'opérateur d'inférence reçoit
effectivement le prompt avec OpenRouter.
L'interface affiche un résumé lisible de ce périmètre, pas l'empreinte seule.
Avec le fallback déterministe, elle indique qu'aucun destinataire IA externe
n'est utilisé.

La route `POST /api/ai-coach/message` effectue un contrôle fail-fast, puis une
transaction courte sous verrou PostgreSQL relit le consentement exact, réserve
définitivement le quota gratuit et crée un bail de transfert de 20 secondes.
Elle committe avant l'historique et l'appel à `askCoach` : aucune connexion DB
n'est immobilisée pendant le réseau. Une ligne historique, générique,
incomplète, d'une ancienne version, d'une ancienne empreinte ou avec
`revokedAt` non nul renvoie `AI_COACH_CONSENT_REQUIRED` et aucun fournisseur
n'est appelé.

Recueil, retrait et admission partagent le verrou consultatif. Le retrait
révoque et photographie les baux antérieurs dans une transaction courte, puis
attend leur clôture ou expiration hors transaction. Dès son `200`, aucun nouveau
transfert ne peut commencer sans nouvel accord. Une échéance globale de
15 secondes, démarrée avant l'admission, est propagée jusqu'au `fetch` ; une
requête qui a consommé son délai en attendant le verrou ne réserve ni quota ni
bail. Un tombstone
transactionnel empêche aussi un recueil concurrent, admis avant le retrait mais
encore en attente du verrou, de réactiver l'autorisation après celui-ci. Cette
barrière porte la finalité technique `AI_COACH_REVOCATION_BARRIER` : une seule
ligne existe par membre et elle est rafraîchie lors des retraits suivants, sans
dépendre de Redis et sans croissance non bornée.

`DELETE /api/me/consents/ai-coach` renseigne `revokedAt` pour toutes les versions
actives de ce type. Il ne supprime ni le compte ni l'historique chiffré déjà
enregistré. Cet historique reste inclus dans l'export et est effacé lors de la
suppression du compte. L'export inclut aussi la barrière de retrait comme trace
technique ; elle ne constitue pas un consentement actif.

La migration `0025_ai_coach_consent` ajoute les dimensions sous forme nullable pour préserver les lignes existantes. Elle ne réalise volontairement aucun backfill : aucune donnée antérieure ne devient un consentement implicite.

### Données envoyées après une question

Lorsqu'aucun garde-fou local ne bloque la demande et qu'un fournisseur tiers est configuré, l'appel contient :

- la question et jusqu'aux dix messages récents utiles à la continuité ;
- l'étape et la langue ;
- un contexte de vocabulaire dérivé de la tradition et du ruleset du compte ;
- un contexte culturel dérivé du pays enregistré.

La passerelle expurge les PII reconnues par ses motifs (emails, téléphones, URL, pseudonymes `@` et longues séquences numériques) dans la question, l'historique et le contexte système avant l'envoi. Elle n'expurge pas automatiquement les prénoms ni le reste du texte libre. Le canal actif est soit Anthropic ou OpenAI en direct, soit OpenRouter avec les seuls opérateurs d'inférence de l'allowlist configurée ; le fallback local ne réalise aucun appel externe. Les filtres `deny` et `zdr` sont des contraintes techniques de routage OpenRouter, pas une preuve d'engagement contractuel, de région, de DPA/SCC ou d'absence d'entraînement.

Le clic de consentement ne transmet aucune de ces données. Elles ne sont préparées pour la passerelle qu'après une question distincte et une nouvelle vérification serveur du consentement exact.

## Destinataires et fonctions indisponibles

Les destinataires dépendent de la configuration réelle : Vercel si l'application y est déployée, l'hébergeur de base de données et de stockage d'images (Supabase lorsqu'il est activé), Resend, Upstash, Stripe et le fournisseur IA actif. Twilio et les services Web Push ne reçoivent des données que s'ils sont activés. La région de la base ou du stockage ne doit pas être déduite du code.

La marketplace de coachs, la réservation de coachs humains et le copilote destiné aux coachs sont indisponibles. Aucun résultat de vérification humaine d'un coach n'est publiquement démontré.

## Références officielles

- [RGPD, articles 12 à 22 — CNIL](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3) : transparence, accès, portabilité, effacement et limites de l'effacement.
- [RGPD, article 7 — CNIL](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2) : retrait du consentement à tout moment et aussi simple que son recueil.
- [Consentement — guide PME du CEPD](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en) : information sur les catégories de données et destinataires, granularité et retrait.

## Validation

```bash
pnpm exec prisma validate
pnpm exec vitest run tests/ai-coach-consent.test.ts tests/ai-coach-consent-route.test.ts tests/ai-coach-consent-scope.test.ts tests/ai-coach-consent-linearization.test.ts tests/ai-coach-message-consent.test.ts tests/ai-coach-consent-ui.test.ts
pnpm test:ai-consent-db
pnpm test:sensitive-consent-db
pnpm exec vitest run tests/account-export.test.ts tests/account-export-route.test.ts tests/i18n-parity.test.ts
```

Le dernier script refuse toute base non locale ou non isolée. Utiliser une base
jetable dont le nom commence par `codex-`, ou un schéma
`codex_ai_consent_*`.
