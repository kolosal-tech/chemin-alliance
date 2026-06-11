/**
 * Détection de coordonnées dans les messages.
 * Renvoie les types détectés ; le message éducatif vient du moteur doctrinal,
 * jamais d'ici (séparation détection / doctrine).
 */
export type ContactLeakKind =
  | "phone"
  | "email"
  | "social_handle"
  | "social_platform"
  | "external_link"
  | "obfuscated_phone";

export type DetectionResult = {
  detected: boolean;
  kinds: ContactLeakKind[];
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// +33 6 12 34 56 78, 0033..., numéros internationaux
const PHONE_INTL_RE = /(?:\+|00)\s?\d{1,3}[\s.-]?\d(?:[\s.-]?\d){6,12}/;
// 06 12 34 56 78, 06.12.34.56.78, 0612345678 (formats FR/BE/CH usuels)
const PHONE_LOCAL_RE = /\b0[1-9](?:[\s.\-]?\d{2}){4}\b/;
// suite de 9+ chiffres éventuellement espacés (hors références bibliques courtes)
const PHONE_LOOSE_RE = /(?:\d[\s.\-_]?){9,}/;
const HANDLE_RE = /(?<![\w@.])@[a-zA-Z0-9_.]{3,}/;
const PLATFORM_RE =
  /\b(whats\s?app|telegram|insta(?:gram)?|facebook|messenger|tik\s?tok|snap(?:chat)?|signal)\b/i;
const PLATFORM_PHRASE_RE =
  /\b(mon\s+insta|mon\s+snap|mon\s+num(?:éro|ero)?|écris[- ]moi\s+sur|ecris[- ]moi\s+sur|ajoute[- ]moi|retrouve[- ]moi\s+sur|add\s+me\s+on|text\s+me\s+on|escr[ií]beme\s+en|agr[ée]game|adiciona[- ]me)\b/i;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
// contournements : "zéro six", "z é r o", "zero seis", "oh six"...
const OBFUSCATED_RE =
  /\b(z\s*[ée]\s*r\s*o|zero|cero)\b[\s,.-]*\b(six|sept|seis|siete|seis|sete|6|7)\b/i;
const SPELLED_DIGITS_RE =
  /\b(?:(?:z[ée]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)[\s,.-]+){5,}/i;

export function detectContactLeak(content: string): DetectionResult {
  const kinds = new Set<ContactLeakKind>();
  // Retirer les emails avant la détection de @handles pour éviter le doublon.
  const withoutEmails = content.replace(EMAIL_RE, " ");

  if (EMAIL_RE.test(content)) kinds.add("email");
  if (PHONE_INTL_RE.test(content) || PHONE_LOCAL_RE.test(content)) {
    kinds.add("phone");
  } else if (PHONE_LOOSE_RE.test(content.replace(/\b\d{1,2}:\d{2}\b/g, ""))) {
    // tolère "Jean 3:16" et les heures, bloque "06 12 34 56 78" déguisé
    kinds.add("phone");
  }
  if (HANDLE_RE.test(withoutEmails)) kinds.add("social_handle");
  if (PLATFORM_RE.test(content) || PLATFORM_PHRASE_RE.test(content)) {
    kinds.add("social_platform");
  }
  if (URL_RE.test(content)) kinds.add("external_link");
  if (OBFUSCATED_RE.test(content) || SPELLED_DIGITS_RE.test(content)) {
    kinds.add("obfuscated_phone");
  }

  return { detected: kinds.size > 0, kinds: [...kinds] };
}

/** Mappe les types détectés vers l'action du moteur doctrinal à valider. */
export function leakKindsToActions(kinds: ContactLeakKind[]): string[] {
  const actions = new Set<string>();
  for (const k of kinds) {
    if (k === "phone" || k === "obfuscated_phone") actions.add("share_phone");
    if (k === "email") actions.add("share_email");
    if (k === "social_handle" || k === "social_platform")
      actions.add("share_social_network");
    if (k === "external_link") actions.add("send_external_link");
  }
  return [...actions];
}
