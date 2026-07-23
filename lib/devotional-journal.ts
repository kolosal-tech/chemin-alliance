export const LEGACY_JOURNAL_KEY = "ca:meditation:journal";
const JOURNAL_KEY_PREFIX = "ca:meditation:journal:v2:";
const MAX_JOURNAL_ENTRIES = 30;

export type JournalEntry = {
  ts: number;
  devotionId: string;
  reference: string;
  text: string;
  verse?: string;
};

export function journalStorageKey(ownerId: string): string {
  return `${JOURNAL_KEY_PREFIX}${encodeURIComponent(ownerId)}`;
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.ts === "number" &&
    Number.isFinite(entry.ts) &&
    typeof entry.devotionId === "string" &&
    typeof entry.reference === "string" &&
    typeof entry.text === "string" &&
    (entry.verse === undefined || typeof entry.verse === "string")
  );
}

export function readJournal(
  storage: Pick<Storage, "getItem">,
  key: string,
): JournalEntry[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJournalEntry).slice(0, MAX_JOURNAL_ENTRIES);
  } catch {
    return [];
  }
}

export function appendJournal(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
  entry: JournalEntry,
): void {
  const list = readJournal(storage, key);
  storage.setItem(
    key,
    JSON.stringify([entry, ...list].slice(0, MAX_JOURNAL_ENTRIES)),
  );
}

export function clearJournalStorage(
  storage: Pick<Storage, "removeItem">,
  ownerId: string,
): void {
  storage.removeItem(journalStorageKey(ownerId));
  // Cette clé historique n'était pas liée à un compte. Il est impossible de
  // l'attribuer sans risque au membre actuellement connecté.
  storage.removeItem(LEGACY_JOURNAL_KEY);
}
