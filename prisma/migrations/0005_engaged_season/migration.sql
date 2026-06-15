-- AlterEnum
-- Ajout de la valeur ENGAGED (fiancés) à LifeSeason.
-- Idempotent : ré-exécutable sans erreur. À RÉELLEMENT EXÉCUTER sur prod
-- (ce n'est pas une capture de dérive comme 0004 — la valeur n'existe pas encore).
ALTER TYPE "LifeSeason" ADD VALUE IF NOT EXISTS 'ENGAGED';
