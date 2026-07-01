-- Index manquants sur deux clés étrangères (Booking.userId, CoupleMessage.senderId).
-- Sans index dédié, chaque lookup par utilisateur (mes réservations, mes messages
-- envoyés) déclenche un Seq Scan sur la table entière à mesure qu'elle grossit.
-- Le build Vercel n'exécute PAS `migrate deploy` → appliquer ce SQL manuellement
-- dans Supabase (SQL Editor) AVANT/au déploiement du code.

CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

CREATE INDEX "CoupleMessage_senderId_idx" ON "CoupleMessage"("senderId");
