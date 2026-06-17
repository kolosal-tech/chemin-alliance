-- Persistance des échanges avec le Coach IA (chiffrés au repos).
-- Sans cette table, les messages du coach n'existaient qu'en mémoire client
-- et disparaissaient au rechargement de la page.
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'individual',
    "role" TEXT NOT NULL,
    "contentEncrypted" TEXT NOT NULL,
    "guardrail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachMessage_userId_mode_createdAt_idx" ON "CoachMessage"("userId", "mode", "createdAt");

ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
