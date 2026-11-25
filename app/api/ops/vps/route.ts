import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const expected = Buffer.from(process.env.CHEMIN_VPS_VERIFY_TOKEN ?? "");
  const actual = Buffer.from(request.headers.get("x-migration-token") ?? "");
  const headers = { "cache-control": "no-store" };
  if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return Response.json({ ok: false }, { status: 404, headers });
  }

  try {
    const [database] = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT current_user = 'chemin_vercel' AND EXISTS (
        SELECT FROM pg_stat_ssl WHERE pid = pg_backend_pid() AND ssl AND client_dn IS NOT NULL
      ) AND EXISTS (SELECT FROM public."User" LIMIT 1) AS ok
    `;
    const path = encodeURIComponent(env.SUPABASE_PHOTO_BUCKET);
    const useFixture = request.headers.get("x-migration-storage-fixture") === "1";
    const object = useFixture ? "__migration_cda_2511/fixture.png" : "migration-probe-absent.png";
    const storage = await fetch(`${env.SUPABASE_URL}/storage/v1/object/authenticated/${path}/${object}`, {
      headers: { authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      signal: AbortSignal.timeout(3500),
    });
    let storageOk: boolean;
    if (useFixture) {
      storageOk = storage.ok && createHash("sha256").update(Buffer.from(await storage.arrayBuffer())).digest("hex") ===
        "8ec3a5773cb65b2c52dc7dd209ad0ad9b07bb73b9218b8ff8d37a99f348d349d";
    } else {
      const detail = await storage.json() as { error?: string; statusCode?: string };
      storageOk = storage.status === 400 && detail.error === "not_found" && detail.statusCode === "404";
    }
    const ok = database?.ok === true && storageOk;
    return Response.json({ ok, database: database?.ok === true, storage: storageOk }, { status: ok ? 200 : 503, headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
