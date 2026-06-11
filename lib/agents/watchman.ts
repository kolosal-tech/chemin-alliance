/**
 * Agent 2 — Veilleur. Détection de comportements à risque dans les messages,
 * au-delà des coordonnées : manipulation spirituelle, argent, pression.
 * Il n'agit JAMAIS seul : il signale à la modération humaine.
 */
export type RiskSignal =
  | "money_request"
  | "spiritual_manipulation"
  | "marriage_pressure"
  | "urgency_rush"
  | "explicit_content";

const PATTERNS: Array<{ signal: RiskSignal; re: RegExp }> = [
  {
    signal: "money_request",
    re: /\b(envoie[- ]?moi|prête[- ]?moi|j'ai besoin de|transfère|mandat|western union|moneygram|paypal|orange money|wave|m-?pesa|urgence financière|frais de (douane|visa|billet)|send me money|necesito dinero|preciso de dinheiro)\b.{0,40}?(€|euros?|francs?|cfa|\$|argent|money|dinero|dinheiro)?|(\b(argent|money|dinero|dinheiro)\b.{0,40}\b(urgent|aide[- ]?moi|help me|ayúdame|ajuda)\b)/i,
  },
  {
    signal: "spiritual_manipulation",
    re: /\b(dieu m'a (dit|révélé|montré)|le seigneur m'a (dit|montré)|j'ai eu une (vision|révélation) (de|à) (toi|ton sujet)|tu es (ma femme|mon mari|mon époux|mon épouse) (selon|devant) dieu|god (told|revealed to) me|dios me (dijo|reveló)|deus me (disse|revelou))\b/i,
  },
  {
    signal: "marriage_pressure",
    re: /\b(il faut (qu'on|que l'on) se marie (vite|rapidement|maintenant)|si tu (m'aimes|crois en dieu), (épouse|marie)|tu n'as pas le choix|une femme de foi (obéit|accepte)|marry me now|cásate conmigo ya)\b/i,
  },
  {
    signal: "urgency_rush",
    re: /\b(viens (chez moi|me voir) (ce soir|maintenant|demain)|on se voit (ce soir|tout de suite)|donne[- ]?moi ton adresse|meet (me )?tonight|ven a mi casa (ya|esta noche))\b/i,
  },
  {
    signal: "explicit_content",
    re: /\b(envoie[- ]?moi (une|des) photos? (de toi )?(intime|sexy|nue?s?)|photo (intime|nue)|nude|sext|fotos? íntimas?)\b/i,
  },
];

export function analyzeRisk(content: string): {
  flagged: boolean;
  signals: RiskSignal[];
} {
  const signals = PATTERNS.filter((p) => p.re.test(content)).map(
    (p) => p.signal,
  );
  return { flagged: signals.length > 0, signals };
}
