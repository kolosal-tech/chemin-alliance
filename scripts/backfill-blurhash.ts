/**
 * Backfill du pipeline photo sécurisé pour les photos DÉJÀ uploadées.
 *
 * Pour chaque user avec `photoUrl` mais sans `photoBlurhash` : télécharge
 * l'original (URL signée), calcule l'empreinte BlurHash (→ `User.photoBlurhash`)
 * et génère + upload la variante moyennement floutée (`<uuid>.blur.jpg`).
 *
 * Script autonome (pas d'alias `@`, pas de `server-only`) - lancer avec l'ENV de
 * PROD (DATABASE_URL + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY +
 * SUPABASE_PHOTO_BUCKET) après avoir appliqué la migration `photoBlurhash` :
 *
 *   pnpm tsx scripts/backfill-blurhash.ts
 *
 * Idempotent (ne retraite pas un user déjà pourvu) et best-effort par user (une
 * photo illisible n'arrête pas le lot). Les photos non traitées restent en
 * fallback dégradé côté UI - aucune régression.
 */
import { PrismaClient } from "@prisma/client";
import { encode } from "blurhash";
import sharp from "sharp";

const prisma = new PrismaClient();

const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const BUCKET = process.env.SUPABASE_PHOTO_BUCKET ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function extractPath(stored: string): string | null {
  for (const seg of [`/object/public/${BUCKET}/`, `/object/sign/${BUCKET}/`]) {
    const i = stored.indexOf(seg);
    if (i >= 0) return stored.slice(i + seg.length).split("?")[0];
  }
  if (!/^https?:\/\//.test(stored)) return stored.replace(/^\/+/, "");
  return null;
}

async function signedUrl(path: string): Promise<string | null> {
  const res = await fetch(`${BASE}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 600 }),
  });
  if (!res.ok) return null;
  const { signedURL } = (await res.json()) as { signedURL?: string };
  if (!signedURL) return null;
  return `${BASE}/storage/v1${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
}

async function uploadObject(
  path: string,
  contentType: string,
  bytes: Buffer,
): Promise<boolean> {
  // fetch n'accepte qu'un ArrayBuffer (types DOM, TS 5.7) → copie propre.
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const res = await fetch(`${BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${KEY}`,
      "content-type": contentType,
      "cache-control": "public, max-age=31536000",
      "x-upsert": "true",
    },
    body,
  });
  return res.ok;
}

async function main() {
  if (!BASE || !BUCKET || !KEY) {
    throw new Error(
      "ENV manquant : SUPABASE_URL + SUPABASE_PHOTO_BUCKET + SUPABASE_SERVICE_ROLE_KEY requis.",
    );
  }

  const users = await prisma.user.findMany({
    where: { photoUrl: { not: null }, photoBlurhash: null },
    select: { id: true, photoUrl: true },
  });
  console.log(`[backfill] ${users.length} photo(s) à traiter`);

  let done = 0;
  let failed = 0;
  for (const u of users) {
    try {
      const path = extractPath(u.photoUrl!);
      if (!path) throw new Error("chemin illisible");

      const signed = await signedUrl(path);
      if (!signed) throw new Error("signature échouée");
      const res = await fetch(signed);
      if (!res.ok) throw new Error(`fetch original ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());

      const { data, info } = await sharp(bytes)
        .raw()
        .ensureAlpha()
        .resize(64, 64, { fit: "inside" })
        .toBuffer({ resolveWithObject: true });
      const blurhash = encode(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
        4,
        4,
      );

      const variant = await sharp(bytes)
        .resize(360, 450, { fit: "cover" })
        .blur(16)
        .jpeg({ quality: 62 })
        .toBuffer();
      const vpath = path.replace(/\.[^./]+$/, "") + ".blur.jpg";
      await uploadObject(vpath, "image/jpeg", variant);

      await prisma.user.update({
        where: { id: u.id },
        data: { photoBlurhash: blurhash },
      });
      done++;
      console.log(`[backfill] ✓ ${u.id}`);
    } catch (err) {
      failed++;
      console.error(`[backfill] ✗ ${u.id}`, err);
    }
  }

  console.log(`[backfill] terminé : ${done} ok, ${failed} échec(s)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
