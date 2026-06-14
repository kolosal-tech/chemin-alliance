/**
 * Agent 2 — Veilleur (v2). Détection de comportements à risque dans les
 * messages, au-delà des coordonnées : argent, manipulation spirituelle,
 * pression, et tropes classiques d'arnaque sentimentale (héritage/loterie,
 * cartes cadeaux/crypto, fausse identité, bascule hors plateforme, récit
 * larmoyant). Il n'agit JAMAIS seul : il signale à la modération humaine.
 *
 * Protection = GRATUITE à vie (doctrine, voir lib/payments/entitlements).
 */
export type RiskSignal =
  | "money_request"
  | "spiritual_manipulation"
  | "marriage_pressure"
  | "urgency_rush"
  | "explicit_content"
  | "inheritance_lottery"
  | "gift_card_crypto"
  | "fake_identity"
  | "off_platform_push"
  | "sob_story";

export type Severity = "none" | "medium" | "high";

// Sévérité par signal. "high" = tromperie/extraction financière caractérisée ;
// "medium" = pression ou trope à confirmer par un humain.
const SEVERITY: Record<RiskSignal, Exclude<Severity, "none">> = {
  money_request: "high",
  inheritance_lottery: "high",
  gift_card_crypto: "high",
  explicit_content: "high",
  spiritual_manipulation: "medium",
  marriage_pressure: "medium",
  urgency_rush: "medium",
  fake_identity: "medium",
  off_platform_push: "medium",
  sob_story: "medium",
};

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
  {
    // Héritage / loterie / gain miraculeux — appât financier classique.
    signal: "inheritance_lottery",
    re: /\b(h[ée]ritage|h[ée]riter|loterie|jackpot|gros lot|gagn[ée] (au|à la|le) (loto|loterie|million)|inheritance|lottery|won the (lottery|jackpot)|herencia|loter[íi]a|heran[çc]a|pr[êe]mio (da loteria|de loteria))\b/i,
  },
  {
    // Cartes cadeaux / cryptomonnaies — moyens d'extraction intraçables.
    signal: "gift_card_crypto",
    re: /\b(carte[- ]?cadeau|gift ?card|google play|steam (card|wallet)|itunes|bitcoin|btc|crypto(monnaie)?|usdt|ethereum|binance|coinbase|trust ?wallet|portefeuille (crypto|bitcoin)|tarjeta regalo|cart[ãa]o (de )?presente)\b/i,
  },
  {
    // Fausse identité — militaire déployé, expatrié, chirurgien à l'étranger.
    signal: "fake_identity",
    re: /\b(militaire (en mission|d[ée]ploy[ée])|soldat (am[ée]ricain|en mission|d[ée]ploy[ée])|casque bleu|plateforme p[ée]troli[èe]re|chirurgien (à l'[ée]tranger|en mission (humanitaire)?)|veuf (récent )?(à l'[ée]tranger|avec un enfant)|deployed (soldier|abroad)|on a (peacekeeping )?mission abroad|oil rig|militar (desplegado|en misi[óo]n))\b/i,
  },
  {
    // Bascule rapide hors plateforme — soustraire l'échange à la modération.
    signal: "off_platform_push",
    re: /\b((passe|donne)[- ]?moi ton (whats?app|t[ée]l[ée]gram|telegram|num[ée]ro)|on continue (sur|par) (whats?app|telegram|hangouts|signal|insta|snap)|ajoute[- ]?moi sur (whats?app|telegram|snap)|[ée]cris[- ]?moi (sur|par) (whats?app|telegram)|let's (talk|chat|continue) on (whats?app|telegram|hangouts)|hablemos por (whats?app|telegram))\b/i,
  },
  {
    // Récit larmoyant — bloqué à la douane, hospitalisé, frais urgents.
    signal: "sob_story",
    re: /\b(bloqu[ée]?s?[- ]?e? (à l'a[ée]roport|à la douane|à l'[ée]tranger)|retenu[e]? à la douane|hospitalis[ée]|gravement malade|op[ée]ration (urgente|chirurgicale)|accident grave|frais (médicaux|d'hôpital)|stuck (at customs|abroad|at the airport)|seriously ill|medical bills|bloqueado en (la aduana|el aeropuerto)|gravemente (enfermo|doente))\b/i,
  },
];

/**
 * Analyse un message. Renvoie les signaux détectés et la sévérité maximale.
 * Rétro-compatible : `flagged` + `signals` conservés ; `severity` ajouté.
 */
export function analyzeRisk(content: string): {
  flagged: boolean;
  signals: RiskSignal[];
  severity: Severity;
} {
  const signals = PATTERNS.filter((p) => p.re.test(content)).map(
    (p) => p.signal,
  );
  const severity: Severity = signals.some((s) => SEVERITY[s] === "high")
    ? "high"
    : signals.length > 0
      ? "medium"
      : "none";
  return { flagged: signals.length > 0, signals, severity };
}
