-- Transition sans perte vers le chiffrement applicatif AES-256-GCM.
--
-- PostgreSQL ne dispose pas de la clé applicative ENCRYPTION_KEY : cette
-- migration de structure ne prétend donc pas chiffrer les valeurs existantes.
-- Le script scripts/backfill-alliance-answers.ts chiffre chaque ancienne
-- valeur avec l'application puis efface le clair dans la même écriture.

ALTER TABLE "AllianceAnswer"
  ADD COLUMN "answerEncrypted" TEXT;

ALTER TABLE "AllianceAnswer"
  ADD CONSTRAINT "AllianceAnswer_has_answer_check"
  CHECK ("answerEncrypted" IS NOT NULL OR char_length("answer") > 0)
  NOT VALID;
