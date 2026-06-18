# Parrain / Marraine — design (MVP)

**Date :** 2026-06-18
**Statut :** validé (périmètre + nom) — prêt à implémenter

## But

Différenciateur validé marché (analogue du « Wali » de Muzz, créneau libre « foi + intention mariage + Afrique francophone ») : impliquer la **famille / communauté** dans le cheminement, comme signal de sérieux, de confiance et **anti-arnaque**, sans trahir la vie privée.

## Périmètre (validé)

L'utilisateur désigne **un** Parrain/Marraine de confiance (parent, pasteur·e, prêtre, ami·e) **par email, sans compte app**. Trois briques :

1. **Désigner / retirer** un Parrain/Marraine (Réglages) : nom affiché, email, relation.
2. **Badge de transparence** sur le profil vu par les matchs : « Accompagné·e par un·e proche » (+ relation, jamais email/nom). Confiance + sérieux + anti-arnaque.
3. **Demande de bénédiction** depuis une mise en relation : email au Parrain/Marraine avec **lien magique tokenisé** → page publique simple (**Bénir** / **Conseiller la prudence** + note courte) → statut + note affichés à l'utilisateur. **Non bloquant** (advisory).

**Hors MVP (YAGNI) :** plusieurs parrains, compte app pour le parrain, lecture des messages, notifications auto à chaque match/étape, gate dur.

## Vie privée

- Le Parrain/Marraine ne lit **jamais** les conversations (aucun déchiffrement tiers, zéro enjeu RGPD).
- Le badge n'expose que la **relation** (jamais email/nom du parrain).
- La page magique ne révèle au parrain que le prénom de son **filleul·e** (l'utilisateur, qui l'a choisi) — **aucune donnée de l'autre partie** du match.
- Note du parrain **chiffrée au repos** (AES-256-GCM, `encryptField`/`decryptOptional`).
- Lien magique = token unique aléatoire (`crypto`), route publique rate-limitée.

## Données (migration prod manuelle — recette Monaco)

```prisma
model Sponsor {
  id        String   @id @default(cuid())
  userId    String   @unique            // 1 parrain/marraine par user (MVP)
  user      User     @relation("UserSponsor", fields: [userId], references: [id], onDelete: Cascade)
  name      String
  email     String
  relation  String                       // family | pastor | priest | friend
  createdAt DateTime @default(now())
  blessings Blessing[]
}

enum BlessingStatus { PENDING  BLESSED  CAUTION }

model Blessing {
  id            String         @id @default(cuid())
  sponsorId     String
  sponsor       Sponsor        @relation(fields: [sponsorId], references: [id], onDelete: Cascade)
  matchId       String                    // pas de FK Match (validé en route) — migration légère
  userId        String                    // = sponsor.userId, pour requêtes
  token         String         @unique
  status        BlessingStatus @default(PENDING)
  noteEncrypted String?
  createdAt     DateTime       @default(now())
  respondedAt   DateTime?
  @@index([userId, matchId])
}
```
+ `User.sponsor Sponsor? @relation("UserSponsor")`.

## API

- `GET/POST/DELETE /api/me/sponsor` — lire / désigner / retirer (auth user).
- `POST /api/matches/[matchId]/blessing` — demander une bénédiction (crée Blessing PENDING + token, email parrain). Garde : membre du match + parrain existant.
- `GET /api/blessing/[token]` + `POST /api/blessing/[token]` — page magique (token-auth, pas de session) : lit la demande / soumet décision + note. Rate-limit.

## UI

- Réglages : carte « Parrain/Marraine » (ajout/retrait).
- Badge sur `buildMatchProfileView` (relation seulement).
- Page publique `app/[locale]/parrain/[token]/page.tsx` (hors groupe (app), sans auth) : « [Prénom] vous demande votre bénédiction » + Bénir / Prudence + note.
- Sur la page alliance : statut de bénédiction + note (déchiffrée) pour l'utilisateur.

## i18n

Clés `sponsor.*` et `blessing.*` × fr/en/es/pt + textes email.

## Tests

- Logique pure : `relation` valides, génération/format token, transitions de statut.
- Garde : demande de bénédiction réservée au membre du match ; soumission réservée à un token PENDING valide.

## Cycle

coder → tester (tsc/lint/vitest/build) → **migration prod Monaco (avec l'utilisateur)** → déployer → test en ligne.
