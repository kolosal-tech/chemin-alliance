-- Revocation des sessions JWT (User.sessionVersion). Incremente a chaque
-- changement/reset de mot de passe : le claim `sv` du jeton doit correspondre,
-- sinon la session est rejetee (cf. getSessionUser). Colonne additive NOT NULL
-- avec DEFAULT 0 -> retro-compatible avec les lignes existantes.
-- Le build Vercel n'execute PAS `migrate deploy` -> appliquer ce SQL manuellement
-- dans Supabase (SQL Editor) AVANT/au deploiement du code.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
