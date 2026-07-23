import type { Locale } from "@/lib/core-engine";

/**
 * Contenu légal structuré, 4 langues.
 * CGU + Politique de confidentialité (RGPD, données sensibles art. 9).
 * Document long : contenu dédié plutôt que messages.json.
 */
export type LegalDoc = {
  title: string;
  updated: string;
  sections: Array<{ h: string; p: string[] }>;
};
export type LegalKey = "terms" | "privacy" | "cookies";

const fr: Record<LegalKey, LegalDoc> = {
  terms: {
    title: "Conditions Générales d'Utilisation",
    updated: "23 juillet 2026",
    sections: [
      {
        h: "1. Objet",
        p: [
          "Chemin d'Alliance est une plateforme chrétienne de rencontre, de discernement et d'accompagnement vers le mariage, puis d'accompagnement de la vie conjugale. Elle s'adresse à des personnes majeures partageant une intention sérieuse de mariage.",
        ],
      },
      {
        h: "2. Charte de conduite",
        p: [
          "En créant un compte, vous vous engagez à : dire la vérité sur votre identité, votre situation familiale et vos intentions ; respecter la dignité de chaque membre ; ne jamais envoyer de contenu explicite, de demande d'argent ou de pression spirituelle (« Dieu m'a dit que… ») ; respecter le rythme de l'autre.",
          "Tout manquement peut entraîner la suspension ou la suppression du compte après examen humain.",
        ],
      },
      {
        h: "3. Le parcours et ses règles",
        p: [
          "La messagerie et l'échange de coordonnées sont gouvernés par un parcours progressif en six étapes. Le partage de téléphone, email ou réseaux sociaux est bloqué tant que l'étape Discernement n'est pas atteinte et la confiance mutuellement validée. Ces règles protègent l'ensemble des membres et ne peuvent être contournées.",
        ],
      },
      {
        h: "4. Agents d'intelligence artificielle",
        p: [
          "La plateforme intègre des agents IA (coach, compagnon de préparation, veilleur, gardien du couple). Ils sont identifiés comme tels, ne prennent jamais de décision à votre place, n'affirment jamais une volonté divine, et orientent vers un accompagnateur humain sur les sujets sensibles. Leurs productions sont des pistes de réflexion, pas des conseils professionnels (ni médicaux, ni psychologiques, ni pastoraux).",
        ],
      },
      {
        h: "5. Sécurité gratuite",
        p: [
          "Le blocage, le signalement, la suppression de compte, les filtres de confidentialité et la modération ne sont jamais payants.",
        ],
      },
      {
        h: "6. Coachs humains",
        p: [
          "La marketplace de coachs, la réservation de coachs humains et le copilote destiné aux coachs ne sont pas disponibles dans cette version. Aucun résultat de vérification humaine de l'identité, de l'affiliation ou de la charte d'un coach n'est publiquement démontré ; la plateforme ne peut donc pas garantir qu'un coach soit vérifié ou certifié.",
        ],
      },
      {
        h: "7. Compte et responsabilités",
        p: [
          "Vous êtes responsable de la confidentialité de vos identifiants. Un compte est strictement personnel. Les faux profils, l'usurpation de titre religieux et l'utilisation commerciale non autorisée sont interdits.",
        ],
      },
      {
        h: "8. Limitation de responsabilité",
        p: [
          "La plateforme fournit un cadre de confiance mais ne garantit ni la conclusion d'un mariage, ni la sincérité absolue des membres. Restez prudent·e : ne communiquez jamais d'informations financières, et signalez tout comportement déplacé.",
        ],
      },
      {
        h: "9. Résiliation",
        p: [
          "Vous pouvez supprimer votre compte à tout moment depuis Réglages → Confidentialité. Cette opération efface vos données propres et pseudonymise le compte. Les données appartenant à des tiers, les signalements et les traces dont la conservation reste nécessaire pour la sécurité, une obligation applicable ou la défense de droits peuvent être conservés pendant la durée nécessaire (voir Politique de confidentialité).",
        ],
      },
      {
        h: "10. Droit applicable",
        p: [
          "Les présentes conditions sont régies par le droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de Confidentialité",
    updated: "23 juillet 2026",
    sections: [
      {
        h: "1. Qui sommes-nous",
        p: [
          "Chemin d'Alliance traite vos données en qualité de responsable de traitement. Contact : alliance@kolosaltech.com.",
        ],
      },
      {
        h: "2. Données sensibles - article 9 RGPD",
        p: [
          "Vos convictions religieuses, votre situation familiale, vos témoignages et vos messages sont des données sensibles au sens de l'article 9 du RGPD. Elles ne sont traitées qu'avec votre consentement explicite, recueilli à l'inscription. Le consentement général se retire à tout moment depuis Réglages → Confidentialité tout en conservant le compte ; ce retrait suspend les traitements métier et les notifications jusqu'à une nouvelle décision explicite. Le consentement distinct AGENT_PROFILING se gère depuis l'interface Préparation ; le consentement distinct AI_COACH_INTERACTION se recueille et se retire depuis l'écran Coach IA.",
          "Les champs sensibles exposés dans le profil disposent de règles de visibilité progressive que vous contrôlez. Témoignage, église locale, vision familiale et messages sont chiffrés au repos (AES-256-GCM).",
        ],
      },
      {
        h: "3. Ce que nous collectons",
        p: [
          "Compte : email, prénom affiché, âge, mot de passe (haché Argon2id - jamais en clair). Profil : tradition chrétienne, dénomination, ministère, situation familiale, intention. Usage : réponses du parcours, messages (chiffrés), check-ins du couple (privés, jamais visibles du conjoint), productions des agents IA vous concernant.",
        ],
      },
      {
        h: "4. Ce que nous ne faisons jamais",
        p: [
          "Vendre vos données. Faire de la publicité ciblée sur la religion. Montrer votre profil à votre communauté locale si le filtre Anti-Malaise est actif. Donner accès à vos messages à un coach ou à votre église sans votre consentement explicite. Révéler à un membre la raison pour laquelle un profil ne lui est pas montré.",
        ],
      },
      {
        h: "5. Agents IA et profilage",
        p: [
          "Le portrait de préparation est établi par un agent IA uniquement avec votre consentement dédié (AGENT_PROFILING), révocable et effaçable en un clic depuis la page Préparation. Il n'est jamais montré aux autres membres et ne conditionne jamais automatiquement votre accès : toute conséquence d'accès passe par un humain.",
          "Lorsqu'un appel tiers est nécessaire pour le coach IA, le fournisseur IA actif reçoit la question, jusqu'aux dix messages récents utiles à la continuité, l'étape, la langue, un contexte de vocabulaire issu de la tradition et du ruleset du compte, ainsi qu'un contexte culturel dérivé du pays enregistré. Les PII détectées par la passerelle (emails, téléphones, URL, pseudonymes @ et longues séquences numériques) sont expurgées de la question, de l'historique et du contexte système avant l'envoi ; les prénoms et le texte libre ne sont pas automatiquement expurgés.",
        ],
      },
      {
        h: "6. Destinataires",
        p: [
          "Selon la configuration réelle du déploiement, peuvent recevoir des données : Vercel s'il héberge l'application ; l'hébergeur configuré de la base de données et du stockage d'images (Supabase lorsqu'il est activé, sans région prédéfinie ici) ; Resend pour les emails transactionnels ; Upstash pour la limitation de débit distribuée ; Stripe pour les paiements et abonnements ; et, pour le Coach IA, soit Anthropic ou OpenAI en direct, soit OpenRouter avec les seuls opérateurs d'inférence explicitement autorisés par la configuration active. Le périmètre IA exact est affiché avant l'accord et son empreinte change dès qu'un modèle, un opérateur ou la politique de routage change, ce qui impose un nouvel accord. OpenRouter reçoit une allowlist exacte, les fallbacks sont désactivés et les filtres deny/ZDR sont exigés ; ces filtres techniques ne prouvent toutefois ni une région, ni un DPA/SCC, ni une absence contractuelle d'entraînement. Le fallback déterministe local n'a aucun destinataire IA externe. Twilio pour la vérification SMS et les services Web Push du navigateur ne reçoivent des données que s'ils sont activés. Un service absent ou non configuré ne reçoit aucune donnée.",
        ],
      },
      {
        h: "7. Durées de conservation",
        p: [
          "Le compte actif est conservé pendant son utilisation. Lors de sa suppression, les données propres du membre (profil, contenus envoyés, parcours, productions IA et consentements) sont effacées et la ligne du compte est pseudonymisée. Les contenus appartenant à des tiers ou partagés avec eux, les signalements et les traces de sécurité ou d'audit nécessaires à une obligation applicable ou à la défense de droits peuvent subsister sous cette identité pseudonymisée, avec un accès limité, pendant la durée nécessaire. Les signalements sont purgés au plus tard 12 mois après leur création.",
        ],
      },
      {
        h: "8. Vos droits",
        p: [
          "L'export JSON en libre-service (Réglages → Confidentialité → Exporter mes données) est borné à 2 000 éléments par collection. Le champ export.complete indique si toutes les collections ont été exportées ; lorsqu'il vaut false, export.collections identifie chaque collection tronquée. Pour obtenir le complément ou exercer un autre droit d'accès, de portabilité, de rectification, d'opposition ou d'effacement, écrivez à alliance@kolosaltech.com. Le consentement général aux données sensibles, AGENT_PROFILING et AI_COACH_INTERACTION disposent chacun d'une commande de retrait autonome dans leur interface ; la suppression du compte reste disponible séparément. Vous pouvez aussi saisir la CNIL (cnil.fr).",
        ],
      },
      {
        h: "9. Sécurité",
        p: [
          "Chiffrement TLS en transit, chiffrement applicatif AES-256-GCM des champs sensibles au repos, mots de passe Argon2id, cookies httpOnly/Secure/SameSite, limitation de débit, détection automatique des comportements à risque revue par des humains.",
        ],
      },
      {
        h: "10. Mineurs",
        p: [
          "La plateforme est strictement réservée aux personnes majeures (18 ans et plus).",
        ],
      },
    ],
  },
  cookies: {
    title: "Politique de Cookies",
    updated: "20 juin 2026",
    sections: [
      {
        h: "1. Qu'est-ce qu'un cookie",
        p: [
          "Un cookie est un petit fichier déposé sur votre appareil par votre navigateur lorsque vous utilisez Chemin d'Alliance. Il nous permet de vous reconnaître d'une page à l'autre et de faire fonctionner les éléments essentiels du service, comme votre session connectée.",
        ],
      },
      {
        h: "2. Cookies strictement nécessaires",
        p: [
          "Nous utilisons un cookie de session strictement nécessaire, httpOnly, Secure en production et SameSite, afin de vous garder connecté·e. Les mutations sont aussi protégées par le contrôle de l'origine de la requête ; aucun cookie publicitaire ou jeton de suivi n'est utilisé. Le thème est conservé localement sur votre appareil, pas dans un cookie serveur.",
        ],
      },
      {
        h: "3. Ce que nous n'utilisons pas",
        p: [
          "Aucun cookie publicitaire. Aucun traceur tiers à des fins de marketing. Aucun pistage inter-sites, aucune empreinte d'appareil (fingerprinting), aucun profilage commercial. Nous ne revendons pas votre navigation et ne ciblons jamais en fonction de votre religion.",
        ],
      },
      {
        h: "4. Pourquoi pas de bannière de consentement",
        p: [
          "Parce que nous n'utilisons que des cookies strictement nécessaires, exemptés de consentement au sens de la directive ePrivacy et des recommandations de la CNIL, aucune bannière intrusive ne vous est imposée. Votre confidentialité est le réglage par défaut, pas une option à reconquérir.",
        ],
      },
      {
        h: "5. Gérer ou supprimer les cookies",
        p: [
          "Vous gardez le contrôle depuis votre navigateur : vous pouvez consulter, bloquer ou supprimer les cookies à tout moment. Supprimer le cookie de session vous déconnecte simplement ; bloquer entièrement les cookies nécessaires empêchera la connexion au service.",
        ],
      },
      {
        h: "6. Durée de conservation",
        p: [
          "Le cookie de session expire au plus tard sept jours après sa création, ou plus tôt en cas de déconnexion, suppression du compte ou révocation de la session. Les préférences stockées localement restent sur l'appareil jusqu'à leur modification ou leur suppression manuelle.",
        ],
      },
      {
        h: "7. Mises à jour",
        p: [
          "Cette politique peut évoluer si le service change. Toute évolution sera publiée sur cette page avec une date de mise à jour. Pour toute question : alliance@kolosaltech.com.",
        ],
      },
    ],
  },
};

const en: Record<LegalKey, LegalDoc> = {
  terms: {
    title: "Terms of Service",
    updated: "July 23, 2026",
    sections: [
      {
        h: "1. Purpose",
        p: [
          "Chemin d'Alliance is a Christian platform for meeting, discernment and accompaniment toward marriage, then for married life. It is intended for adults with a serious intention of marriage.",
        ],
      },
      {
        h: "2. Code of conduct",
        p: [
          "By creating an account you commit to: truthfulness about your identity, family situation and intentions; respecting every member's dignity; never sending explicit content, money requests or spiritual pressure (\"God told me that…\"); respecting the other person's pace.",
          "Violations may lead to suspension or deletion after human review.",
        ],
      },
      {
        h: "3. The journey and its rules",
        p: [
          "Messaging and contact exchange are governed by a progressive six-stage journey. Sharing phone, email or social networks is blocked until the Discernment stage is reached and mutual trust confirmed. These rules protect all members and cannot be bypassed.",
        ],
      },
      {
        h: "4. AI agents",
        p: [
          "The platform includes AI agents (coach, preparation companion, watchman, couple's guardian). They are identified as such, never decide for you, never claim divine will, and refer sensitive matters to a human companion. Their output is food for thought, not professional advice (medical, psychological or pastoral).",
        ],
      },
      {
        h: "5. Free safety",
        p: [
          "Blocking, reporting, account deletion, privacy filters and moderation are never paid features.",
        ],
      },
      {
        h: "6. Human coaches",
        p: [
          "The coach marketplace, human-coach booking and coach copilot are not available in this version. No result of a human review of a coach's identity, affiliation or charter is publicly demonstrated, so the platform cannot guarantee that a coach is verified or certified.",
        ],
      },
      {
        h: "7. Account and responsibilities",
        p: [
          "You are responsible for your credentials. Accounts are strictly personal. Fake profiles, impersonating religious titles and unauthorized commercial use are prohibited.",
        ],
      },
      {
        h: "8. Limitation of liability",
        p: [
          "The platform provides a framework of trust but guarantees neither marriage nor members' absolute sincerity. Stay cautious: never share financial information, and report any inappropriate behavior.",
        ],
      },
      {
        h: "9. Termination",
        p: [
          "You may delete your account at any time from Settings → Privacy. This erases data you own and pseudonymizes the account. Data belonging to other people, reports and records that still need to be retained for safety, an applicable obligation or the defense of legal claims may be kept for the necessary period (see Privacy Policy).",
        ],
      },
      {
        h: "10. Governing law",
        p: [
          "These terms are governed by French law. Amicable resolution will be sought before any legal action.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "July 23, 2026",
    sections: [
      {
        h: "1. Who we are",
        p: [
          "Chemin d'Alliance processes your data as controller. Contact: alliance@kolosaltech.com.",
        ],
      },
      {
        h: "2. Sensitive data - GDPR article 9",
        p: [
          "Your religious beliefs, family situation, testimonies and messages are sensitive data under GDPR article 9. They are processed only with your explicit consent, given at sign-up. General consent can be withdrawn at any time from Settings → Privacy while keeping the account; withdrawal suspends business processing and notifications until a new explicit decision. The separate AGENT_PROFILING consent is managed from the Preparation interface; the separate AI_COACH_INTERACTION consent is given and withdrawn from the AI Coach screen.",
          "Sensitive fields exposed in the profile have progressive visibility rules under your control. Testimony, local church, family vision and messages are encrypted at rest (AES-256-GCM).",
        ],
      },
      {
        h: "3. What we collect",
        p: [
          "Account: email, display name, age, password (Argon2id hash - never plaintext). Profile: Christian tradition, denomination, ministry, family situation, intention. Usage: journey answers, messages (encrypted), couple check-ins (private, never visible to your spouse), AI agent outputs about you.",
        ],
      },
      {
        h: "4. What we never do",
        p: [
          "Sell your data. Religion-targeted advertising. Show your profile to your local community when the local comfort filter is on. Give a coach or your church access to your messages without your explicit consent. Reveal to a member why a profile is not shown to them.",
        ],
      },
      {
        h: "5. AI agents and profiling",
        p: [
          "The preparation portrait is built by an AI agent only with your dedicated consent (AGENT_PROFILING), revocable and erasable in one click from the Preparation page. It is never shown to other members and never automatically conditions your access: any access consequence goes through a human.",
          "When the AI coach requires a third-party call, the active AI provider receives the question, up to ten recent messages used for continuity, the stage, language, vocabulary context derived from the account's tradition and ruleset, and cultural context derived from the recorded country. PII detected by gateway patterns (email addresses, phone numbers, URLs, @handles and long numeric sequences) is redacted from the question, history and system context before transmission; names and free text are not automatically redacted.",
        ],
      },
      {
        h: "6. Recipients",
        p: [
          "Depending on the actual deployment configuration, data may be received by: Vercel if it hosts the application; the configured database and image-storage host (Supabase when enabled, with no region assumed here); Resend for transactional email; Upstash for distributed rate limiting; Stripe for payments and subscriptions; and, for the AI Coach, either Anthropic or OpenAI directly, or OpenRouter with only the inference operators explicitly allowed by the active configuration. The exact AI scope is shown before consent and its fingerprint changes whenever a model, operator or routing policy changes, requiring new consent. OpenRouter receives the exact allowlist, fallbacks are disabled and deny/ZDR filters are required; these technical filters do not prove a region, DPA/SCC, or a contractual no-training commitment. The local deterministic fallback has no external AI recipient. Twilio for SMS verification and browser Web Push services receive data only when enabled. A service that is absent or not configured receives no data.",
        ],
      },
      {
        h: "7. Retention",
        p: [
          "An active account is kept while it is in use. On deletion, member-owned data (profile, sent content, journey, AI outputs and consents) is erased and the account row is pseudonymized. Content belonging to or shared with other people, reports, and security or audit records needed for an applicable obligation or the defense of legal claims may remain under that pseudonymous identity, with restricted access, for the necessary period. Reports are purged no later than 12 months after creation.",
        ],
      },
      {
        h: "8. Your rights",
        p: [
          "The self-service JSON export (Settings → Privacy → Export my data) is limited to 2,000 items per collection. The export.complete field says whether every collection was exported; when it is false, export.collections identifies each truncated collection. To obtain the remainder or exercise another right of access, portability, correction, objection or erasure, email alliance@kolosaltech.com. General sensitive-data consent, AGENT_PROFILING and AI_COACH_INTERACTION each have a standalone withdrawal control in their interface; account deletion remains available separately. You may also complain to your local data-protection authority (CNIL in France).",
        ],
      },
      {
        h: "9. Security",
        p: [
          "TLS in transit, AES-256-GCM application-level encryption of sensitive fields at rest, Argon2id passwords, httpOnly/Secure/SameSite cookies, rate limiting, automatic risk detection reviewed by humans.",
        ],
      },
      {
        h: "10. Minors",
        p: ["The platform is strictly reserved for adults (18+)."],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: "June 20, 2026",
    sections: [
      {
        h: "1. What is a cookie",
        p: [
          "A cookie is a small file your browser stores on your device when you use Chemin d'Alliance. It lets us recognize you from one page to the next and run essential parts of the service, such as your signed-in session.",
        ],
      },
      {
        h: "2. Strictly necessary cookies",
        p: [
          "We use one strictly necessary session cookie, httpOnly, Secure in production and SameSite, to keep you signed in. Mutations are also protected by request-origin checks; no advertising cookie or tracking token is used. The theme is stored locally on your device, not in a server cookie.",
        ],
      },
      {
        h: "3. What we don't use",
        p: [
          "No advertising cookies. No third-party marketing trackers. No cross-site tracking, no device fingerprinting, no commercial profiling. We do not resell your browsing and never target based on your religion.",
        ],
      },
      {
        h: "4. Why there's no consent banner",
        p: [
          "Because we use only strictly necessary cookies - exempt from consent under the ePrivacy directive and data-protection guidance - no intrusive banner is forced on you. Privacy is the default, not something you have to win back.",
        ],
      },
      {
        h: "5. Managing or deleting cookies",
        p: [
          "You stay in control from your browser: you can view, block or delete cookies at any time. Deleting the session cookie simply signs you out; fully blocking necessary cookies will prevent signing in to the service.",
        ],
      },
      {
        h: "6. Retention",
        p: [
          "The session cookie expires no later than seven days after it is created, or sooner when you sign out, delete the account or the session is revoked. Locally stored preferences remain on the device until you change or clear them manually.",
        ],
      },
      {
        h: "7. Updates",
        p: [
          "This policy may change as the service evolves. Any change will be posted on this page with an updated date. Questions: alliance@kolosaltech.com.",
        ],
      },
    ],
  },
};

const es: Record<LegalKey, LegalDoc> = {
  terms: {
    title: "Condiciones Generales de Uso",
    updated: "23 de julio de 2026",
    sections: [
      {
        h: "1. Objeto",
        p: [
          "Chemin d'Alliance es una plataforma cristiana de encuentro, discernimiento y acompañamiento hacia el matrimonio, y luego de la vida conyugal. Está destinada a personas mayores de edad con intención seria de matrimonio.",
        ],
      },
      {
        h: "2. Carta de conducta",
        p: [
          "Al crear una cuenta te comprometes a: decir la verdad sobre tu identidad, situación familiar e intenciones; respetar la dignidad de cada miembro; no enviar nunca contenido explícito, peticiones de dinero ni presión espiritual («Dios me dijo que…»); respetar el ritmo del otro.",
          "Los incumplimientos pueden conllevar suspensión o eliminación tras revisión humana.",
        ],
      },
      {
        h: "3. El camino y sus reglas",
        p: [
          "La mensajería y el intercambio de contactos se rigen por un camino progresivo de seis etapas. Compartir teléfono, correo o redes sociales está bloqueado hasta alcanzar la etapa de Discernimiento con confianza mutua validada. Estas reglas protegen a todos y no pueden eludirse.",
        ],
      },
      {
        h: "4. Agentes de IA",
        p: [
          "La plataforma integra agentes de IA (coach, compañero de preparación, vigilante, guardián de la pareja). Se identifican como tales, nunca deciden por ti, nunca afirman una voluntad divina y derivan los temas sensibles a un acompañante humano. Sus respuestas son pistas de reflexión, no consejo profesional.",
        ],
      },
      {
        h: "5. Seguridad gratuita",
        p: [
          "El bloqueo, la denuncia, la eliminación de cuenta, los filtros de privacidad y la moderación nunca son de pago.",
        ],
      },
      {
        h: "6. Coaches humanos",
        p: [
          "El marketplace de coaches, la reserva de coaches humanos y el copiloto destinado a los coaches no están disponibles en esta versión. No se demuestra públicamente ningún resultado de una revisión humana de la identidad, afiliación o carta de un coach; por tanto, la plataforma no puede garantizar que un coach esté verificado o certificado.",
        ],
      },
      {
        h: "7. Cuenta y responsabilidades",
        p: [
          "Eres responsable de tus credenciales. La cuenta es estrictamente personal. Se prohíben los perfiles falsos, la usurpación de títulos religiosos y el uso comercial no autorizado.",
        ],
      },
      {
        h: "8. Limitación de responsabilidad",
        p: [
          "La plataforma ofrece un marco de confianza pero no garantiza el matrimonio ni la sinceridad absoluta de los miembros. Sé prudente: nunca comuniques información financiera y denuncia todo comportamiento inapropiado.",
        ],
      },
      {
        h: "9. Baja",
        p: [
          "Puedes eliminar tu cuenta en cualquier momento desde Ajustes → Confidencialidad. Esta operación borra tus datos propios y seudonimiza la cuenta. Los datos pertenecientes a terceros, las denuncias y los registros que aún deban conservarse por seguridad, una obligación aplicable o la defensa de reclamaciones pueden mantenerse durante el periodo necesario.",
        ],
      },
      {
        h: "10. Derecho aplicable",
        p: [
          "Estas condiciones se rigen por el derecho francés. Se buscará una solución amistosa antes de cualquier acción judicial.",
        ],
      },
    ],
  },
  privacy: {
    title: "Política de Privacidad",
    updated: "23 de julio de 2026",
    sections: [
      {
        h: "1. Quiénes somos",
        p: [
          "Chemin d'Alliance trata tus datos como responsable del tratamiento. Contacto: alliance@kolosaltech.com.",
        ],
      },
      {
        h: "2. Datos sensibles - artículo 9 RGPD",
        p: [
          "Tus convicciones religiosas, situación familiar, testimonios y mensajes son datos sensibles (art. 9 RGPD). Solo se tratan con tu consentimiento explícito, recogido al registrarte. El consentimiento general puede retirarse en cualquier momento desde Ajustes → Privacidad conservando la cuenta; la retirada suspende los tratamientos del servicio y las notificaciones hasta una nueva decisión explícita. El consentimiento separado AGENT_PROFILING se gestiona desde la interfaz Preparación; el consentimiento separado AI_COACH_INTERACTION se otorga y se retira desde la pantalla Coach IA.",
          "Los campos sensibles expuestos en el perfil tienen reglas de visibilidad progresiva bajo tu control. Testimonio, iglesia local, visión familiar y mensajes se cifran en reposo (AES-256-GCM).",
        ],
      },
      {
        h: "3. Qué recogemos",
        p: [
          "Cuenta: correo, nombre mostrado, edad, contraseña (hash Argon2id). Perfil: tradición cristiana, denominación, ministerio, situación familiar, intención. Uso: respuestas del camino, mensajes (cifrados), check-ins de pareja (privados, nunca visibles para tu cónyuge), producciones de los agentes de IA.",
        ],
      },
      {
        h: "4. Lo que nunca hacemos",
        p: [
          "Vender tus datos. Publicidad segmentada por religión. Mostrar tu perfil a tu comunidad local con el filtro anti-incomodidad activo. Dar acceso a tus mensajes a un coach o a tu iglesia sin tu consentimiento explícito. Revelar a un miembro por qué no se le muestra un perfil.",
        ],
      },
      {
        h: "5. Agentes de IA y perfilado",
        p: [
          "El retrato de preparación se elabora solo con tu consentimiento dedicado (AGENT_PROFILING), revocable y borrable con un clic. Nunca se muestra a otros miembros y nunca condiciona automáticamente tu acceso: toda consecuencia pasa por un humano.",
          "Cuando el coach IA requiere una llamada a un tercero, el proveedor de IA activo recibe la pregunta, hasta diez mensajes recientes usados para la continuidad, la etapa, el idioma, un contexto de vocabulario derivado de la tradición y del ruleset de la cuenta, y un contexto cultural derivado del país registrado. Las PII detectadas por los patrones de la pasarela (correos, teléfonos, URL, alias @ y secuencias numéricas largas) se expurgan de la pregunta, el historial y el contexto del sistema antes del envío; los nombres y el texto libre no se expurgan automáticamente.",
        ],
      },
      {
        h: "6. Destinatarios",
        p: [
          "Según la configuración real del despliegue, pueden recibir datos: Vercel si aloja la aplicación; el proveedor configurado de base de datos y almacenamiento de imágenes (Supabase cuando está activado, sin presuponer aquí una región); Resend para el correo transaccional; Upstash para la limitación distribuida de peticiones; Stripe para pagos y suscripciones; y, para el Coach IA, Anthropic u OpenAI directamente, o bien OpenRouter con los únicos operadores de inferencia autorizados explícitamente por la configuración activa. El alcance exacto de IA se muestra antes del consentimiento y su huella cambia cuando cambia un modelo, operador o política de enrutamiento, lo que exige un nuevo consentimiento. OpenRouter recibe la lista exacta, se desactivan los fallbacks y se exigen los filtros deny/ZDR; estos filtros técnicos no prueban una región, un DPA/SCC ni un compromiso contractual de no entrenamiento. El fallback determinista local no tiene destinatario externo de IA. Twilio para la verificación por SMS y los servicios Web Push del navegador solo reciben datos si están activados. Un servicio ausente o no configurado no recibe datos.",
        ],
      },
      {
        h: "7. Conservación",
        p: [
          "La cuenta activa se conserva mientras se usa. Al eliminarla, se borran los datos propios del miembro (perfil, contenido enviado, camino, producciones de IA y consentimientos) y la fila de la cuenta se seudonimiza. Los contenidos pertenecientes o compartidos con terceros, las denuncias y los registros de seguridad o auditoría necesarios para una obligación aplicable o la defensa de reclamaciones pueden mantenerse bajo esa identidad seudonimizada, con acceso restringido, durante el periodo necesario. Las denuncias se purgan a más tardar 12 meses después de su creación.",
        ],
      },
      {
        h: "8. Tus derechos",
        p: [
          "La exportación JSON de autoservicio está limitada a 2.000 elementos por colección. El campo export.complete indica si se exportaron todas las colecciones; cuando vale false, export.collections identifica cada colección truncada. Para obtener el resto o ejercer otro derecho de acceso, portabilidad, rectificación, oposición o supresión, escribe a alliance@kolosaltech.com. El consentimiento general para datos sensibles, AGENT_PROFILING y AI_COACH_INTERACTION disponen cada uno de un control autónomo de retirada en su interfaz; la eliminación de la cuenta sigue disponible por separado. También puedes reclamar ante tu autoridad de protección de datos.",
        ],
      },
      {
        h: "9. Seguridad",
        p: [
          "TLS en tránsito, cifrado AES-256-GCM en reposo de los campos sensibles, contraseñas Argon2id, cookies httpOnly/Secure/SameSite, limitación de peticiones, detección de riesgos revisada por humanos.",
        ],
      },
      {
        h: "10. Menores",
        p: ["Plataforma estrictamente reservada a mayores de 18 años."],
      },
    ],
  },
  cookies: {
    title: "Política de Cookies",
    updated: "20 de junio de 2026",
    sections: [
      {
        h: "1. Qué es una cookie",
        p: [
          "Una cookie es un pequeño archivo que tu navegador guarda en tu dispositivo cuando usas Chemin d'Alliance. Nos permite reconocerte de una página a otra y hacer funcionar los elementos esenciales del servicio, como tu sesión iniciada.",
        ],
      },
      {
        h: "2. Cookies estrictamente necesarias",
        p: [
          "Usamos una cookie de sesión estrictamente necesaria, httpOnly, Secure en producción y SameSite, para mantener tu sesión. Las mutaciones también están protegidas mediante controles del origen de la solicitud; no usamos cookies publicitarias ni tokens de seguimiento. El tema se guarda localmente en tu dispositivo, no en una cookie del servidor.",
        ],
      },
      {
        h: "3. Lo que no usamos",
        p: [
          "Ninguna cookie publicitaria. Ningún rastreador de terceros con fines de marketing. Ningún seguimiento entre sitios, ninguna huella de dispositivo (fingerprinting), ningún perfilado comercial. No revendemos tu navegación ni segmentamos según tu religión.",
        ],
      },
      {
        h: "4. Por qué no hay banner de consentimiento",
        p: [
          "Como solo usamos cookies estrictamente necesarias, exentas de consentimiento según la directiva ePrivacy y las recomendaciones de las autoridades, no te imponemos ningún banner intrusivo. La privacidad es el ajuste por defecto, no una opción que debas recuperar.",
        ],
      },
      {
        h: "5. Gestionar o eliminar las cookies",
        p: [
          "Mantienes el control desde tu navegador: puedes consultar, bloquear o eliminar las cookies en cualquier momento. Eliminar la cookie de sesión simplemente cierra tu sesión; bloquear por completo las cookies necesarias impedirá conectarte al servicio.",
        ],
      },
      {
        h: "6. Conservación",
        p: [
          "La cookie de sesión caduca como máximo siete días después de su creación, o antes si cierras sesión, eliminas la cuenta o se revoca la sesión. Las preferencias almacenadas localmente permanecen en el dispositivo hasta que las cambias o borras.",
        ],
      },
      {
        h: "7. Actualizaciones",
        p: [
          "Esta política puede evolucionar si el servicio cambia. Cualquier cambio se publicará en esta página con una fecha de actualización. Para cualquier duda: alliance@kolosaltech.com.",
        ],
      },
    ],
  },
};

const pt: Record<LegalKey, LegalDoc> = {
  terms: {
    title: "Termos e Condições de Utilização",
    updated: "23 de julho de 2026",
    sections: [
      {
        h: "1. Objeto",
        p: [
          "O Chemin d'Alliance é uma plataforma cristã de encontro, discernimento e acompanhamento rumo ao casamento, e depois da vida conjugal. Destina-se a maiores de idade com intenção séria de casamento.",
        ],
      },
      {
        h: "2. Carta de conduta",
        p: [
          "Ao criar uma conta comprometes-te a: dizer a verdade sobre a tua identidade, situação familiar e intenções; respeitar a dignidade de cada membro; nunca enviar conteúdo explícito, pedidos de dinheiro ou pressão espiritual («Deus disse-me que…»); respeitar o ritmo do outro.",
          "O incumprimento pode levar à suspensão ou eliminação após análise humana.",
        ],
      },
      {
        h: "3. O percurso e as suas regras",
        p: [
          "As mensagens e a troca de contactos são governadas por um percurso progressivo de seis etapas. Partilhar telefone, email ou redes sociais está bloqueado até à etapa de Discernimento com confiança mútua validada. Estas regras protegem todos e não podem ser contornadas.",
        ],
      },
      {
        h: "4. Agentes de IA",
        p: [
          "A plataforma integra agentes de IA (coach, companheiro de preparação, vigilante, guardião do casal). Identificam-se como tal, nunca decidem por ti, nunca afirmam uma vontade divina e encaminham os assuntos sensíveis para um acompanhante humano. As suas respostas são pistas de reflexão, não aconselhamento profissional.",
        ],
      },
      {
        h: "5. Segurança gratuita",
        p: [
          "O bloqueio, a denúncia, a eliminação de conta, os filtros de privacidade e a moderação nunca são pagos.",
        ],
      },
      {
        h: "6. Coaches humanos",
        p: [
          "O marketplace de coaches, a reserva de coaches humanos e o copiloto destinado aos coaches não estão disponíveis nesta versão. Não é publicamente demonstrado qualquer resultado de uma verificação humana da identidade, afiliação ou carta de um coach; por isso, a plataforma não pode garantir que um coach seja verificado ou certificado.",
        ],
      },
      {
        h: "7. Conta e responsabilidades",
        p: [
          "És responsável pelas tuas credenciais. A conta é estritamente pessoal. São proibidos perfis falsos, usurpação de títulos religiosos e uso comercial não autorizado.",
        ],
      },
      {
        h: "8. Limitação de responsabilidade",
        p: [
          "A plataforma oferece um quadro de confiança mas não garante o casamento nem a sinceridade absoluta dos membros. Sê prudente: nunca partilhes informações financeiras e denuncia comportamentos inadequados.",
        ],
      },
      {
        h: "9. Cancelamento",
        p: [
          "Podes eliminar a tua conta a qualquer momento em Definições → Confidencialidade. Esta operação apaga os dados que te pertencem e pseudonimiza a conta. Os dados pertencentes a terceiros, as denúncias e os registos que ainda tenham de ser conservados por segurança, uma obrigação aplicável ou a defesa de direitos podem ser mantidos durante o período necessário.",
        ],
      },
      {
        h: "10. Lei aplicável",
        p: [
          "Estes termos regem-se pelo direito francês. Procurar-se-á uma solução amigável antes de qualquer ação judicial.",
        ],
      },
    ],
  },
  privacy: {
    title: "Política de Privacidade",
    updated: "23 de julho de 2026",
    sections: [
      {
        h: "1. Quem somos",
        p: [
          "O Chemin d'Alliance trata os teus dados como responsável pelo tratamento. Contacto: alliance@kolosaltech.com.",
        ],
      },
      {
        h: "2. Dados sensíveis - artigo 9.º RGPD",
        p: [
          "As tuas convicções religiosas, situação familiar, testemunhos e mensagens são dados sensíveis (art. 9.º RGPD). Só são tratados com o teu consentimento explícito, recolhido no registo. O consentimento geral pode ser retirado a qualquer momento em Definições → Privacidade mantendo a conta; a retirada suspende os tratamentos do serviço e as notificações até uma nova decisão explícita. O consentimento separado AGENT_PROFILING é gerido na interface Preparação; o consentimento separado AI_COACH_INTERACTION é dado e retirado no ecrã Coach IA.",
          "Os campos sensíveis expostos no perfil têm regras de visibilidade progressiva sob o teu controlo. Testemunho, igreja local, visão familiar e mensagens são cifrados em repouso (AES-256-GCM).",
        ],
      },
      {
        h: "3. O que recolhemos",
        p: [
          "Conta: email, nome apresentado, idade, palavra-passe (hash Argon2id). Perfil: tradição cristã, denominação, ministério, situação familiar, intenção. Utilização: respostas do percurso, mensagens (cifradas), check-ins do casal (privados, nunca visíveis ao cônjuge), produções dos agentes de IA.",
        ],
      },
      {
        h: "4. O que nunca fazemos",
        p: [
          "Vender os teus dados. Publicidade dirigida por religião. Mostrar o teu perfil à tua comunidade local com o filtro anti-desconforto ativo. Dar acesso às tuas mensagens a um coach ou à tua igreja sem o teu consentimento explícito. Revelar a um membro porque é que um perfil não lhe é mostrado.",
        ],
      },
      {
        h: "5. Agentes de IA e definição de perfis",
        p: [
          "O retrato de preparação é elaborado apenas com o teu consentimento dedicado (AGENT_PROFILING), revogável e apagável num clique. Nunca é mostrado a outros membros e nunca condiciona automaticamente o teu acesso: qualquer consequência passa por um humano.",
          "Quando o coach IA exige uma chamada a terceiros, o fornecedor de IA ativo recebe a pergunta, até dez mensagens recentes usadas para continuidade, a etapa, o idioma, um contexto de vocabulário derivado da tradição e do ruleset da conta, e um contexto cultural derivado do país registado. As PII detetadas pelos padrões da gateway (emails, telefones, URL, identificadores @ e sequências numéricas longas) são expurgadas da pergunta, do histórico e do contexto do sistema antes do envio; os nomes e o texto livre não são automaticamente expurgados.",
        ],
      },
      {
        h: "6. Destinatários",
        p: [
          "Consoante a configuração real da implementação, podem receber dados: a Vercel, se alojar a aplicação; o fornecedor configurado da base de dados e do armazenamento de imagens (Supabase quando ativado, sem presumir aqui uma região); a Resend para email transacional; a Upstash para limitação distribuída de pedidos; a Stripe para pagamentos e subscrições; e, para o Coach IA, a Anthropic ou a OpenAI diretamente, ou a OpenRouter apenas com os operadores de inferência explicitamente autorizados pela configuração ativa. O âmbito exato da IA é apresentado antes do consentimento e a respetiva impressão digital muda quando muda um modelo, operador ou política de encaminhamento, exigindo novo consentimento. A OpenRouter recebe a lista exata, os fallbacks são desativados e os filtros deny/ZDR são exigidos; estes filtros técnicos não provam uma região, um DPA/SCC nem um compromisso contratual de não treino. O fallback determinístico local não tem destinatário externo de IA. A Twilio para verificação por SMS e os serviços Web Push do navegador só recebem dados quando ativados. Um serviço ausente ou não configurado não recebe dados.",
        ],
      },
      {
        h: "7. Conservação",
        p: [
          "A conta ativa é conservada enquanto estiver em uso. Ao eliminá-la, são apagados os dados próprios do membro (perfil, conteúdo enviado, percurso, produções de IA e consentimentos) e a linha da conta é pseudonimizada. Os conteúdos pertencentes ou partilhados com terceiros, as denúncias e os registos de segurança ou auditoria necessários para uma obrigação aplicável ou para a defesa de direitos podem permanecer sob essa identidade pseudonimizada, com acesso limitado, durante o período necessário. As denúncias são purgadas o mais tardar 12 meses após a criação.",
        ],
      },
      {
        h: "8. Os teus direitos",
        p: [
          "A exportação JSON em autosserviço está limitada a 2 000 elementos por coleção. O campo export.complete indica se todas as coleções foram exportadas; quando vale false, export.collections identifica cada coleção truncada. Para obter o restante ou exercer outro direito de acesso, portabilidade, retificação, oposição ou apagamento, escreve para alliance@kolosaltech.com. O consentimento geral para dados sensíveis, AGENT_PROFILING e AI_COACH_INTERACTION têm, cada um, um controlo autónomo de retirada na respetiva interface; a eliminação da conta continua disponível em separado. Também podes reclamar junto da tua autoridade de proteção de dados (CNPD/CNIL).",
        ],
      },
      {
        h: "9. Segurança",
        p: [
          "TLS em trânsito, cifragem AES-256-GCM em repouso dos campos sensíveis, palavras-passe Argon2id, cookies httpOnly/Secure/SameSite, limitação de pedidos, deteção de riscos revista por humanos.",
        ],
      },
      {
        h: "10. Menores",
        p: ["Plataforma estritamente reservada a maiores de 18 anos."],
      },
    ],
  },
  cookies: {
    title: "Política de Cookies",
    updated: "20 de junho de 2026",
    sections: [
      {
        h: "1. O que é um cookie",
        p: [
          "Um cookie é um pequeno ficheiro que o teu navegador guarda no teu dispositivo quando usas o Chemin d'Alliance. Permite-nos reconhecer-te de uma página para a outra e fazer funcionar os elementos essenciais do serviço, como a tua sessão iniciada.",
        ],
      },
      {
        h: "2. Cookies estritamente necessários",
        p: [
          "Usamos um cookie de sessão estritamente necessário, httpOnly, Secure em produção e SameSite, para manter a sessão. As mutações também são protegidas por controlos da origem do pedido; não usamos cookies publicitários nem tokens de rastreio. O tema é guardado localmente no dispositivo, não num cookie do servidor.",
        ],
      },
      {
        h: "3. O que não usamos",
        p: [
          "Nenhum cookie publicitário. Nenhum rastreador de terceiros para fins de marketing. Nenhum rastreio entre sites, nenhuma impressão digital do dispositivo (fingerprinting), nenhum perfil comercial. Não revendemos a tua navegação nem segmentamos com base na tua religião.",
        ],
      },
      {
        h: "4. Porque não há banner de consentimento",
        p: [
          "Como usamos apenas cookies estritamente necessários, isentos de consentimento nos termos da diretiva ePrivacy e das orientações das autoridades, não te impomos qualquer banner intrusivo. A privacidade é a definição por omissão, não uma opção a reconquistar.",
        ],
      },
      {
        h: "5. Gerir ou eliminar os cookies",
        p: [
          "Manténs o controlo a partir do teu navegador: podes consultar, bloquear ou eliminar os cookies a qualquer momento. Eliminar o cookie de sessão apenas termina a tua sessão; bloquear totalmente os cookies necessários impedirá a ligação ao serviço.",
        ],
      },
      {
        h: "6. Conservação",
        p: [
          "O cookie de sessão expira no máximo sete dias após a criação, ou antes quando termina a sessão, elimina a conta ou a sessão é revogada. As preferências guardadas localmente permanecem no dispositivo até serem alteradas ou apagadas.",
        ],
      },
      {
        h: "7. Atualizações",
        p: [
          "Esta política pode evoluir se o serviço mudar. Qualquer alteração será publicada nesta página com uma data de atualização. Para qualquer questão: alliance@kolosaltech.com.",
        ],
      },
    ],
  },
};

export const LEGAL: Record<Locale, Record<LegalKey, LegalDoc>> = {
  fr,
  en,
  es,
  pt,
};
