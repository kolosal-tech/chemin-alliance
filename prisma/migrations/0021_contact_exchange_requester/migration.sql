-- Empêche l'auteur d'une demande d'échange de coordonnées de l'accepter
-- lui-même. Les anciennes demandes REQUESTED restent sans auteur et sont donc
-- volontairement refusées (fail-closed) jusqu'à une nouvelle demande.
ALTER TABLE "Match"
  ADD COLUMN IF NOT EXISTS "contactExchangeRequestedBy" TEXT;
