import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import pt from "@/messages/pt.json";

const component = readFileSync(
  new URL("../app/[locale]/(app)/coach-ai/coach-chat.tsx", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../prisma/migrations/0025_ai_coach_consent/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const productionRunbook = readFileSync(
  new URL("../prisma/migrations/PROD_DEPLOY.md", import.meta.url),
  "utf8",
);

describe("UI et migration du consentement Coach IA", () => {
  it("offre recueil, retrait et désactive la saisie sans accord", () => {
    expect(component).toContain('fetch("/api/me/consents/ai-coach"');
    expect(component).toContain('action === "grant" ? "POST" : "DELETE"');
    expect(component).toContain("disabled={!consent.active || consentBusy}");
    expect(component).toContain("disabled={consentBusy}");
    expect(component).toContain('t("aiCoach.consentRevoke")');
    expect(component).toContain('data?.error === "AI_COACH_CONSENT_REQUIRED"');
  });

  it("garde la carte prioritaire hors du journal et la version lisible sur écran étroit", () => {
    expect(
      component.indexOf('data-testid="ai-coach-consent-card"'),
    ).toBeLessThan(component.indexOf('role="log"'));
    expect(component).toContain(
      '"max-h-[55vh] flex-none overflow-y-auto supports-[height:100dvh]:max-h-[55dvh]"',
    );
    expect(component).toContain(
      "flex flex-col items-start gap-2 sm:flex-row sm:justify-between",
    );
    expect(component).toContain("max-w-full break-all rounded-lg");
    expect(
      component.match(/className="break-words \[overflow-wrap:anywhere\]"/g),
    ).toHaveLength(2);
    expect(component).not.toContain("whitespace-nowrap");
  });

  it("n'auto-scroll pas sur l'historique sans consentement actif", () => {
    expect(component).toMatch(
      /useEffect\(\(\) => \{\s*[\s\S]*?if \(!consent\.active\) return;[\s\S]*?scrollIntoView/,
    );
    expect(component).toContain("[entries, busy, consent.active]");
  });

  it("permet le retrait pendant une réponse et lui laisse le temps d'attendre la barrière serveur", () => {
    expect(component).toContain(
      'AbortSignal.timeout(action === "revoke" ? 45_000 : 15_000)',
    );
    expect(component).not.toContain("disabled={consentBusy || busy}");
    expect(component).toContain('consent.recipientSummary === "LOCAL_ONLY"');
  });

  it("le clic de recueil n'ajoute aucun body à la requête de consentement", () => {
    const consentFetch = component.match(
      /fetch\("\/api\/me\/consents\/ai-coach", \{([\s\S]*?)\n\s*\}\);/,
    )?.[1];
    expect(consentFetch).toBeDefined();
    expect(consentFetch).not.toMatch(/\bbody\s*:/);
  });

  it.each([
    ["fr", fr],
    ["en", en],
    ["es", es],
    ["pt", pt],
  ] as const)(
    "%s décrit finalité, données, destinataire et retrait",
    (_, cat) => {
      expect(cat.aiCoach.consentPurpose).toBeTruthy();
      expect(cat.aiCoach.consentData).toMatch(/10/);
      expect(cat.aiCoach.consentRecipient).toContain("{recipients}");
      expect(cat.aiCoach.consentRecipientLocal).toBeTruthy();
      expect(cat.aiCoach.consentDetails).toBeTruthy();
      expect(cat.aiCoach.consentNoDataOnGrant).toBeTruthy();
      expect(cat.aiCoach.consentWithdrawal).toBeTruthy();
    },
  );

  it("la migration n'accorde aucun consentement implicite", () => {
    const executableSql = migration.replace(/--.*$/gm, "");
    const partialIndex = executableSql.slice(
      executableSql.indexOf(
        'CREATE UNIQUE INDEX "Consent_ai_coach_active_scope_key"',
      ),
    );
    expect(executableSql).not.toMatch(/^\s*(?:INSERT|UPDATE)\b/im);
    expect(executableSql).toContain('ADD COLUMN "version" TEXT');
    expect(executableSql).toContain('CREATE TABLE "AiCoachTransferLease"');
    expect(executableSql).not.toMatch(
      /ADD COLUMN "(?:version|purpose|recipient)" TEXT NOT NULL/i,
    );
    // PostgreSQL peut interdire l'usage d'une nouvelle valeur enum avant le
    // commit qui l'ajoute. Le DDL de l'index reste donc générique et ne cite
    // pas AI_COACH_INTERACTION dans son prédicat.
    expect(partialIndex).not.toContain("'AI_COACH_INTERACTION'");
    expect(partialIndex).toMatch(/"version" IS NOT NULL/);
  });

  it("le runbook de production couvre 0025 et interdit le backfill", () => {
    expect(productionRunbook).toContain("0025_ai_coach_consent");
    expect(productionRunbook).toMatch(
      /aucun\s+`INSERT`,\s+`UPDATE` ni backfill/i,
    );
    expect(productionRunbook).toContain(
      "WHERE \"type\" = 'AI_COACH_INTERACTION'",
    );
  });
});
