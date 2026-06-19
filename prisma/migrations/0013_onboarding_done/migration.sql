-- Flag d'onboarding persistant distinct (Phase 2).
-- Horodate la fin/validation du parcours d'accueil par l'utilisateur.
-- NULL = onboarding pas encore fait. Additif, nullable, aucun backfill.
ALTER TABLE "User" ADD COLUMN "onboardingDoneAt" TIMESTAMP(3);
