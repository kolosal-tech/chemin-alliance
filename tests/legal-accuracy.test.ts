import { describe, expect, it } from "vitest";
import { LEGAL } from "@/lib/legal/content";
import regimes from "@/lib/legal/regimes.content.json";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import frMessages from "@/messages/fr.json";
import ptMessages from "@/messages/pt.json";
import { TERMS_OF_SERVICE_CONSENT } from "@/lib/legal/consent-scope";

const locales = ["fr", "en", "es", "pt"] as const;
type LegalLocale = (typeof locales)[number];
type RegimeContent = (typeof regimes)[keyof typeof regimes];

const regimeValues = Object.values(regimes) as RegimeContent[];

function baseSection(
  locale: LegalLocale,
  document: "terms" | "privacy",
  number: number,
): string {
  const section = LEGAL[locale][document].sections.find((candidate) =>
    candidate.h.startsWith(`${number}.`),
  );
  expect(section, `${locale}.${document} section ${number}`).toBeDefined();
  return section!.p.join(" ");
}

function regimeSections(
  locale: LegalLocale,
  section: "recipients" | "rights",
): string[] {
  return regimeValues.map((regime) => regime[section][locale].p.join(" "));
}

describe("contenu légal aligné sur l'implémentation", () => {
  it("lie la preuve d'acceptation à la date des conditions affichées", () => {
    expect(TERMS_OF_SERVICE_CONSENT).toEqual({
      type: "TERMS_OF_SERVICE",
      version: "terms-of-service:2026-07-23",
      purpose: "ACCEPTANCE_OF_TERMS_AND_CODE_OF_CONDUCT",
      recipient: "CHEMIN_ALLIANCE_CORE_SERVICE",
    });
    expect(LEGAL.fr.terms.updated).toBe("23 juillet 2026");
    expect(LEGAL.en.terms.updated).toBe("July 23, 2026");
    expect(LEGAL.es.terms.updated).toBe("23 de julio de 2026");
    expect(LEGAL.pt.terms.updated).toBe("23 de julho de 2026");
  });

  it.each([
    ["fr", frMessages.auth.consentSensitive, frMessages.auth.consentTerms],
    ["en", enMessages.auth.consentSensitive, enMessages.auth.consentTerms],
    ["es", esMessages.auth.consentSensitive, esMessages.auth.consentTerms],
    ["pt", ptMessages.auth.consentSensitive, ptMessages.auth.consentTerms],
  ])(
    "%s informe du retrait sensible et accepte explicitement les conditions",
    (_locale, sensitive, terms) => {
      expect(sensitive).toMatch(
        /retirer cet accord|withdraw this consent|retirar este consentimiento|retirar este consentimento/i,
      );
      expect(terms).toMatch(
        /Conditions d'utilisation|Terms of Service|Condiciones de uso|Termos de utilização/i,
      );
      expect(terms).toMatch(/charte|code of conduct|carta/i);
    },
  );

  it.each([
    ["fr", frMessages.privacy.deleteConfirmBody, "pseudonymisé"],
    ["en", enMessages.privacy.deleteConfirmBody, "pseudonymized"],
    ["es", esMessages.privacy.deleteConfirmBody, "seudonimizará"],
    ["pt", ptMessages.privacy.deleteConfirmBody, "pseudonimizada"],
  ])(
    "%s décrit honnêtement la pseudonymisation dans la confirmation UI",
    (_locale, message, marker) => {
      expect(message).toContain(marker);
      expect(message).not.toMatch(
        /toutes vos données seront effacées|all your data will be erased|todos tus datos serán borrados|todos os seus dados serão apagados/i,
      );
    },
  );

  it.each(locales)(
    "%s divulgue les fournisseurs IA configurables sans promettre OpenRouter seul",
    (locale) => {
      const text = baseSection(locale, "privacy", 6);

      expect(text).toContain("Anthropic");
      expect(text).toContain("OpenRouter");
      expect(text).toContain("OpenAI");
      expect(text).not.toMatch(
        /éditeurs des modèles|publishers of the models|editores de los modelos|editores dos modelos/i,
      );
    },
  );

  it.each(locales)(
    "%s divulgue les opérateurs d'inférence et impose un nouvel accord si le routage change",
    (locale) => {
      const texts = [
        baseSection(locale, "privacy", 6),
        ...regimeSections(locale, "recipients"),
      ];
      const operators = {
        fr: /opérateurs d'inférence/i,
        en: /inference operators/i,
        es: /operadores de inferencia/i,
        pt: /operadores de inferência/i,
      } satisfies Record<LegalLocale, RegExp>;
      const scopeChange = {
        fr: /modèle, (?:un |d')?opérateur ou (?:la |de )?politique de routage/i,
        en: /model, operator or routing.policy/i,
        es: /modelo, operador o política de enrutamiento/i,
        pt: /modelo, operador ou política de encaminhamento/i,
      } satisfies Record<LegalLocale, RegExp>;
      const routingSafeguards =
        /allowlist|lista exacta|lista exata|liste exacte/i;
      const contractualLimit =
        /DPA\/SCC|absence contractuelle d'entraînement|contractual no-training|compromiso contractual de no entrenamiento|compromisso contratual de não treino/i;
      const localOnly = {
        fr: /fallback .{0,30}local.{0,50}aucun destinataire IA externe/i,
        en: /local .{0,30}fallback.{0,50}no external AI recipient/i,
        es: /fallback .{0,30}local.{0,50}no tiene destinatario externo de IA/i,
        pt: /fallback .{0,30}local.{0,50}não tem destinatário (?:IA externo|externo de IA)/i,
      } satisfies Record<LegalLocale, RegExp>;

      for (const text of texts) {
        expect(text).toContain("OpenRouter");
        expect(text).toMatch(operators[locale]);
        expect(text).toMatch(scopeChange[locale]);
        expect(text).toMatch(localOnly[locale]);
        expect(text).toMatch(routingSafeguards);
        expect(text).toMatch(contractualLimit);
      }
    },
  );

  it("ne revendique ni coach certifié actif, ni jeton CSRF inexistant, ni cinq niveaux figés", () => {
    const text = JSON.stringify({ LEGAL, regimes });

    expect(text).not.toMatch(
      /Listed companions are verified|accompagnateurs référencés sont vérifiés|Los acompañantes están verificados|Os acompanhantes são verificados|anti-CSRF|5 niveaux|5 levels|5 niveles|5 níveis/,
    );
    expect(text).not.toMatch(
      /single active AI provider|seul fournisseur IA actif|único proveedor de IA activo|único fornecedor de IA ativo/i,
    );
  });

  it("interdit les anciennes promesses absolues d'export, d'effacement et de région fixe", () => {
    const text = JSON.stringify({ LEGAL, regimes });

    expect(text).not.toMatch(
      /export JSON complet|full JSON export|exportación JSON completa|exportação JSON completa|exportez l'intégralité|export all of your data|exporta todos tus datos|exporta todos os teus dados/i,
    );
    expect(text).not.toMatch(
      /réelle et définitive|real(?:ly)?,? (?:and )?final|real y definitiva|real e definitiva|effacement[^.]{0,40}cascade|cascading erasure|borra[^.]{0,40}cascada|apaga[^.]{0,40}cascata/i,
    );
    expect(text).not.toMatch(/Stockholm|Estocolmo/i);
  });

  it.each(locales)(
    "%s explique la borne d'export et les métadonnées de troncature dans tous les régimes",
    (locale) => {
      const texts = [
        baseSection(locale, "privacy", 8),
        ...regimeSections(locale, "rights"),
      ];

      for (const text of texts) {
        expect(text).toMatch(/2[ ,.]000/);
        expect(text).toContain("export.complete");
        expect(text).toContain("export.collections");
        expect(text).toMatch(/tronqu|trunc/i);
      }
    },
  );

  it.each(locales)(
    "%s décrit l'effacement des données propres, la pseudonymisation et les rétentions nécessaires",
    (locale) => {
      const patterns = {
        fr: [/données propres/i, /pseudonym/i, /tiers/i, /signalement/i],
        en: [
          /own data|data you own|member-owned data/i,
          /pseudonym/i,
          /other people|third-party/i,
          /reports/i,
        ],
        es: [/datos propios/i, /seudonim/i, /tercer/i, /denuncias/i],
        pt: [
          /dados (?:próprios|que te pertencem)/i,
          /pseudonim/i,
          /terceir/i,
          /denúncias/i,
        ],
      } satisfies Record<LegalLocale, RegExp[]>;
      const texts = [
        baseSection(locale, "terms", 9),
        baseSection(locale, "privacy", 7),
        ...regimeSections(locale, "rights"),
      ];

      for (const text of texts) {
        for (const pattern of patterns[locale]) {
          expect(text).toMatch(pattern);
        }
      }
    },
  );

  it.each(locales)(
    "%s distingue le retrait général et les consentements IA autonomes",
    (locale) => {
      const sensitiveBasis = baseSection(locale, "privacy", 2);
      const rightsTexts = [
        baseSection(locale, "privacy", 8),
        ...regimeSections(locale, "rights"),
      ];
      const privacyControl = {
        fr: /Réglages . Confidentialité/i,
        en: /Settings . Privacy/i,
        es: /Ajustes . Privacidad/i,
        pt: /Definições . Privacidade/i,
      } satisfies Record<LegalLocale, RegExp>;
      const accountDeletion = {
        fr: /suppression du compte/i,
        en: /account deletion/i,
        es: /eliminación de la cuenta/i,
        pt: /eliminação da conta/i,
      } satisfies Record<LegalLocale, RegExp>;
      const suspension = {
        fr: /suspend les traitements métier et les notifications/i,
        en: /suspends business processing and notifications/i,
        es: /suspende los tratamientos del servicio y las notificaciones/i,
        pt: /suspende os tratamentos do serviço e as notificações/i,
      } satisfies Record<LegalLocale, RegExp>;

      expect(sensitiveBasis).toMatch(privacyControl[locale]);
      expect(sensitiveBasis).toMatch(suspension[locale]);
      expect(sensitiveBasis).toContain("AGENT_PROFILING");
      expect(sensitiveBasis).toContain("AI_COACH_INTERACTION");
      expect(sensitiveBasis).not.toMatch(
        /no standalone control|pas de bouton autonome|no existe un control autónomo|não existe um controlo autónomo/i,
      );

      for (const text of rightsTexts) {
        expect(text).toContain("alliance@kolosaltech.com");
        expect(text).toMatch(
          /consentement général|general sensitive-data consent|consentimiento general|consentimento geral/i,
        );
        expect(text).toContain("AGENT_PROFILING");
        expect(text).toContain("AI_COACH_INTERACTION");
        expect(text).toMatch(accountDeletion[locale]);
        expect(text).toMatch(/autonom|autónom|standalone/i);
      }
    },
  );

  it.each(locales)(
    "%s décrit exactement le contexte envoyé au coach IA et l'expurgation des PII",
    (locale) => {
      const text = baseSection(locale, "privacy", 5);
      const languagePatterns = {
        fr: {
          question: /question/i,
          history: /messages récents/i,
          stage: /étape/i,
          language: /langue/i,
          tradition: /tradition/i,
          country: /pays/i,
          redaction: /expurg/i,
        },
        en: {
          question: /question/i,
          history: /recent messages/i,
          stage: /stage/i,
          language: /language/i,
          tradition: /tradition/i,
          country: /country/i,
          redaction: /redact/i,
        },
        es: {
          question: /pregunta/i,
          history: /mensajes recientes/i,
          stage: /etapa/i,
          language: /idioma/i,
          tradition: /tradición/i,
          country: /país/i,
          redaction: /expurg/i,
        },
        pt: {
          question: /pergunta/i,
          history: /mensagens recentes/i,
          stage: /etapa/i,
          language: /idioma/i,
          tradition: /tradição/i,
          country: /país/i,
          redaction: /expurg/i,
        },
      } satisfies Record<LegalLocale, Record<string, RegExp>>;

      expect(text).toContain("ruleset");
      expect(text).toContain("PII");
      expect(text).toMatch(/prénoms|names|nombres|nomes/i);
      expect(text).toMatch(
        /pas automatiquement|not automatically|no se expurgan automáticamente|não são automaticamente/i,
      );
      for (const pattern of Object.values(languagePatterns[locale])) {
        expect(text).toMatch(pattern);
      }
    },
  );

  it.each(locales)(
    "%s rend chaque liste de destinataires conditionnelle et complète",
    (locale) => {
      const texts = [
        baseSection(locale, "privacy", 6),
        ...regimeSections(locale, "recipients"),
      ];
      const conditional = {
        fr: /Selon la configuration|lorsqu'il est activé/i,
        en: /Depending on the active|when enabled/i,
        es: /Según la configuración|cuando está activado/i,
        pt: /Consoante a configuração|quando ativado/i,
      } satisfies Record<LegalLocale, RegExp>;

      for (const text of texts) {
        for (const provider of [
          "Vercel",
          "Supabase",
          "Resend",
          "Upstash",
          "Stripe",
          "Anthropic",
          "OpenRouter",
          "OpenAI",
          "Twilio",
          "Web Push",
        ]) {
          expect(text).toContain(provider);
        }
        expect(text).toMatch(conditional[locale]);
        expect(text).not.toMatch(/Stockholm|Estocolmo/i);
      }
    },
  );

  it.each(locales)(
    "%s annonce l'indisponibilité de la marketplace, des coachs et du copilote sans vérification publique",
    (locale) => {
      const text = baseSection(locale, "terms", 6);

      expect(text).toMatch(/marketplace/i);
      expect(text).toMatch(/coach/i);
      expect(text).toMatch(/copilot/i);
      expect(text).toMatch(
        /pas disponibles|not available|no están disponibles|não estão disponíveis/i,
      );
      expect(text).toMatch(/publiquement|publicly|públicamente|publicamente/i);
      expect(text).toMatch(/vérifi|verif/i);
    },
  );

  it.each(locales)(
    "%s décrit la durée maximale réelle de sept jours du cookie de session",
    (locale) => {
      const text = LEGAL[locale].cookies.sections
        .flatMap((section) => section.p)
        .join(" ");

      expect(text).toMatch(/sept jours|seven days|siete días|sete dias/);
    },
  );
});
