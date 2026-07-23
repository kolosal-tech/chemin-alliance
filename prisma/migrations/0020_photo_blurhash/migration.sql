-- Le champ est deja utilise par le client Prisma, le seed et le proxy photo.
-- Il manquait dans la chaine de migrations, ce qui cassait tout deploiement
-- construit uniquement depuis prisma/migrations.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "photoBlurhash" TEXT;
