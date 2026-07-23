import { describe, expect, it, vi } from "vitest";
import {
  appendJournal,
  clearJournalStorage,
  journalStorageKey,
  LEGACY_JOURNAL_KEY,
  readJournal,
  type JournalEntry,
} from "@/lib/devotional-journal";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

const entry: JournalEntry = {
  ts: 1,
  devotionId: "devotion-1",
  reference: "Ps 1",
  text: "Réflexion privée",
};

describe("journal de méditation local", () => {
  it("isole le stockage de chaque compte", () => {
    expect(journalStorageKey("member-a")).not.toBe(
      journalStorageKey("member-b"),
    );
    expect(journalStorageKey("member/a")).toContain("member%2Fa");
  });

  it("relit seulement les entrées valides", () => {
    const storage = memoryStorage();
    const key = journalStorageKey("member-a");
    storage.setItem(key, JSON.stringify([entry, { text: "incomplète" }]));

    expect(readJournal(storage, key)).toEqual([entry]);
  });

  it("conserve au maximum les trente dernières réflexions", () => {
    const storage = memoryStorage();
    const key = journalStorageKey("member-a");

    for (let index = 0; index < 35; index += 1) {
      appendJournal(storage, key, { ...entry, ts: index, text: `${index}` });
    }

    const result = readJournal(storage, key);
    expect(result).toHaveLength(30);
    expect(result[0]?.text).toBe("34");
    expect(result[29]?.text).toBe("5");
  });

  it("efface le journal du compte et l'ancienne clé globale ambiguë", () => {
    const storage = memoryStorage();
    const key = journalStorageKey("member-a");
    storage.setItem(key, JSON.stringify([entry]));
    storage.setItem(LEGACY_JOURNAL_KEY, JSON.stringify([entry]));

    clearJournalStorage(storage, "member-a");

    expect(readJournal(storage, key)).toEqual([]);
    expect(storage.getItem(LEGACY_JOURNAL_KEY)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(key);
    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_JOURNAL_KEY);
  });
});
