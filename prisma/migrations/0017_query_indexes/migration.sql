-- Index additifs purs (aucune colonne modifiée, pas de dialog RLS attendu),
-- alignés sur les requêtes réellement exécutées par l'app (lues en amont dans
-- lib/matching.ts et les routes citées). Risque de dérive à l'échelle, pas un
-- bug aujourd'hui : ces requêtes fonctionnent déjà, ces index évitent un
-- Seq Scan croissant à mesure que les tables grossissent.
-- Le build Vercel n'exécute PAS `migrate deploy` → appliquer ce SQL manuellement
-- dans Supabase (SQL Editor) AVANT/au déploiement du code.

-- User : getSuggestions (lib/matching.ts) filtre TOUJOURS deletedAt + season +
-- isVerified ; gender est optionnel. Remplace l'ancien index (0009) par un
-- ordre de colonnes qui restreint le vivier avant le filtre optionnel.
DROP INDEX IF EXISTS "User_season_isVerified_gender_deletedAt_idx";
CREATE INDEX "User_deletedAt_season_isVerified_gender_idx"
  ON "User"("deletedAt", "season", "isVerified", "gender");

-- Report : app/api/admin/reports/route.ts filtre status IN [OPEN, REVIEWING]
-- (sans targetUserId), trié par createdAt desc.
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- Match : app/api/matches/list/route.ts fait OR(userAId, userBId) trié par
-- updatedAt desc. Couvre chaque branche du OR avec le tri.
CREATE INDEX "Match_userAId_updatedAt_idx" ON "Match"("userAId", "updatedAt");
CREATE INDEX "Match_userBId_updatedAt_idx" ON "Match"("userBId", "updatedAt");

-- Blessing : app/api/matches/[matchId]/blessing/route.ts fait
-- findFirst({ userId, matchId, status: "PENDING" }) pour la dédup anti-spam.
DROP INDEX IF EXISTS "Blessing_userId_matchId_idx";
CREATE INDEX "Blessing_userId_matchId_status_idx"
  ON "Blessing"("userId", "matchId", "status");

-- CoupleSpace : app/api/couple/**/*.ts fait OR(userAId, userBId) + status
-- (route.ts, season/route.ts) et userBId + status (messages/route.ts).
-- userAId/userBId sont déjà @unique (index implicite par colonne) mais ne
-- couvrent pas le filtre status combiné.
CREATE INDEX "CoupleSpace_userAId_status_idx" ON "CoupleSpace"("userAId", "status");
CREATE INDEX "CoupleSpace_userBId_status_idx" ON "CoupleSpace"("userBId", "status");
