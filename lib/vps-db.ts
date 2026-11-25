import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function vpsDatabaseUrl(): string | undefined {
  const identity = process.env.CHEMIN_VPS_TLS;
  if (!identity) return;

  const parsed = JSON.parse(identity) as { p12?: string; passphrase?: string };
  if (!parsed.p12 || !parsed.passphrase || !process.env.CHEMIN_VPS_DATABASE_URL) {
    throw new Error("Identité TLS Chemin incomplète");
  }
  const url = new URL(process.env.CHEMIN_VPS_DATABASE_URL);
  const folder = mkdtempSync(join(tmpdir(), "chemin-tls-"));
  const certificate = join(folder, "client.p12");
  writeFileSync(certificate, Buffer.from(parsed.p12, "base64"), {
    flag: "wx",
    mode: 0o600,
  });
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  url.searchParams.set("sslidentity", certificate);
  url.searchParams.set("sslpassword", parsed.passphrase);
  return url.href;
}
