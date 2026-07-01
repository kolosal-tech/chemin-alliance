-- 0018_drop_alliance_lab
-- MIGRATION DESTRUCTIVE : suppression definitive du module "Alliance Lab"
-- (jeu d'entrainement solo contre personas IA). Detruit les tables AiPersona,
-- GameSession, GameAnswer et les types GameType / GameSessionStatus.
-- PERTE DE DONNEES : toutes les parties et personas d'entrainement sont perdues.
-- A appliquer MANUELLEMENT et VOLONTAIREMENT (voir PROD_DEPLOY.md), jamais en routine.
-- Ne touche PAS aux Compagnons IA (AiCompanionMeta), qui sont un module distinct.

-- Ordre de suppression : dependances descendantes (GameAnswer -> GameSession -> AiPersona).
DROP TABLE IF EXISTS "GameAnswer" CASCADE;
DROP TABLE IF EXISTS "GameSession" CASCADE;
DROP TABLE IF EXISTS "AiPersona" CASCADE;

-- Types enum devenus orphelins.
DROP TYPE IF EXISTS "GameSessionStatus";
DROP TYPE IF EXISTS "GameType";
