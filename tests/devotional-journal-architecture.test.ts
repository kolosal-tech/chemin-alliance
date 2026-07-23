import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("intégration du journal local privé", () => {
  it("isole le journal avec l'identité authentifiée fournie par le serveur", () => {
    const page = read("app/[locale]/(app)/devotional/page.tsx");
    const client = read("app/[locale]/(app)/devotional/devotional-client.tsx");

    expect(page).toContain("journalOwnerId={user.id}");
    expect(client).toContain("journalStorageKey(journalOwnerId)");
    expect(client).not.toContain(
      'localStorage.getItem("ca:meditation:journal")',
    );
  });

  it("efface le journal local seulement après une suppression serveur réussie", () => {
    const privacyPage = read("app/[locale]/(app)/settings/privacy/page.tsx");
    const privacyPanel = read(
      "app/[locale]/(app)/settings/privacy/privacy-panel.tsx",
    );
    const successIndex = privacyPanel.indexOf(
      'if (!res.ok) throw new Error("account_delete_failed")',
    );
    const clearIndex = privacyPanel.indexOf(
      "clearJournalStorage(localStorage, journalOwnerId)",
    );

    expect(privacyPage).toContain("journalOwnerId={user.id}");
    expect(successIndex).toBeGreaterThan(-1);
    expect(clearIndex).toBeGreaterThan(successIndex);
  });

  it("offre un effacement confirmé sans imposer la suppression du compte", () => {
    const client = read("app/[locale]/(app)/devotional/devotional-client.tsx");

    expect(client).toContain("confirmClearJournal");
    expect(client).toContain('tone="danger"');
    expect(client).toContain(
      "clearJournalStorage(localStorage, journalOwnerId)",
    );
  });
});
