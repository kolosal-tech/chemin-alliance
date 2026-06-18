-- Champs profil additionnels (centres d'intérêt, caractère, rêves & projets)
ALTER TABLE "RelationshipProfile" ADD COLUMN "interests" TEXT;
ALTER TABLE "RelationshipProfile" ADD COLUMN "personality" TEXT;
ALTER TABLE "RelationshipProfile" ADD COLUMN "aspirations" TEXT;
