import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { vpsDatabaseUrl } from "../lib/vps-db";

async function main() {
  if (!process.env.CHEMIN_VPS_TLS) return;
  const database = new PrismaClient({ datasources: { db: { url: vpsDatabaseUrl() } } });
  try {
    const [row] = await database.$queryRaw<{ ok: boolean }[]>`
      SELECT current_user = 'chemin_vercel' AND EXISTS (
        SELECT FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl AND client_dn IS NOT NULL
      ) AND EXISTS (SELECT FROM public."User" LIMIT 1) AS ok
    `;
    if (!row?.ok) throw new Error("PostgreSQL VPS non vérifié");
    const base = process.env.CHEMIN_VPS_STORAGE_URL;
    const headers = { authorization: `Bearer ${process.env.CHEMIN_VPS_STORAGE_KEY}` };
    const route = `${base}/storage/v1/object/authenticated/profile-photos/`;
    const object = await fetch(route + "__migration_cda_2511/fixture.png", { headers, signal: AbortSignal.timeout(5000) });
    if (object.ok) {
      const hash = createHash("sha256").update(Buffer.from(await object.arrayBuffer())).digest("hex");
      if (hash !== "8ec3a5773cb65b2c52dc7dd209ad0ad9b07bb73b9218b8ff8d37a99f348d349d") {
        throw new Error("Empreinte du stockage VPS inattendue");
      }
      console.log("CHEMIN_VPS_BUILD_OK postgres_mtls=true stockage_fixture_sha256=true");
    } else {
      const detail = await object.json() as { error?: string; statusCode?: string };
      if (object.status !== 400 || detail.error !== "not_found" || detail.statusCode !== "404") {
        throw new Error("Accès au stockage VPS non vérifié");
      }
      console.log("CHEMIN_VPS_BUILD_OK postgres_mtls=true stockage_authentifie=true");
    }
  } finally {
    await database.$disconnect();
  }
}

main().catch(() => {
  console.error("CHEMIN_VPS_BUILD_FAILED");
  process.exitCode = 1;
});
