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
    updated: "12 juin 2026",
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
          "Les accompagnateurs référencés sont vérifiés (identité, affiliation, charte). Les séances sont conclues directement entre vous et l'accompagnateur ; la plateforme n'est pas partie au contrat d'accompagnement.",
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
          "Vous pouvez supprimer votre compte à tout moment depuis Réglages → Confidentialité. La suppression est réelle et entraîne l'effacement en cascade de vos données (voir Politique de confidentialité).",
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
    updated: "12 juin 2026",
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
          "Vos convictions religieuses, votre situation familiale, vos témoignages et vos messages sont des données sensibles au sens de l'article 9 du RGPD. Elles ne sont traitées qu'avec votre consentement explicite, recueilli à l'inscription et révocable à tout moment.",
          "Chaque champ sensible possède un niveau de visibilité (5 niveaux) que vous contrôlez. Témoignage, église locale, vision familiale et messages sont chiffrés au repos (AES-256-GCM).",
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
          "Les questions au coach IA peuvent être traitées par un fournisseur de modèle de langage (via OpenRouter). Aucune donnée de profil n'y est jointe au-delà de votre question, de l'étape en cours et de votre langue.",
        ],
      },
      {
        h: "6. Destinataires",
        p: [
          "Hébergement : Vercel (UE/USA, clauses contractuelles types). Base de données : Supabase, région Stockholm (UE). Emails transactionnels : Resend. Modèles de langage : OpenRouter (uniquement le texte de vos questions au coach IA).",
        ],
      },
      {
        h: "7. Durées de conservation",
        p: [
          "Compte actif : durée d'utilisation. Compte supprimé : effacement immédiat en cascade (profil, messages, parcours, portraits, consentements). Signalements : conservés 12 mois à des fins de sécurité.",
        ],
      },
      {
        h: "8. Vos droits",
        p: [
          "Accès et portabilité : export JSON complet en un clic (Réglages → Confidentialité → Exporter mes données). Effacement : suppression de compte en un clic, réelle et définitive. Opposition et retrait du consentement : à tout moment, sans frais, sans justification. Réclamation : CNIL (cnil.fr).",
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
          "Nous n'utilisons que des cookies indispensables au fonctionnement de la plateforme : un cookie de session sécurisé (httpOnly, Secure, SameSite) qui vous garde connecté·e, un jeton anti-CSRF qui protège vos formulaires, et de petites préférences techniques (langue d'affichage, thème clair ou sombre). Sans eux, l'authentification et la sécurité ne peuvent pas fonctionner.",
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
          "Le cookie de session expire à la fin de votre session ou après une période d'inactivité. Les préférences techniques (langue, thème) sont conservées jusqu'à leur modification ou leur suppression manuelle. Aucun cookie nécessaire n'est conservé au-delà de ce qui est utile à son usage.",
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
    updated: "June 12, 2026",
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
          "Listed companions are verified (identity, affiliation, charter). Sessions are concluded directly between you and the companion; the platform is not a party to that contract.",
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
          "You may delete your account at any time from Settings → Privacy. Deletion is real and cascades to your data (see Privacy Policy).",
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
    updated: "June 12, 2026",
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
          "Your religious beliefs, family situation, testimonies and messages are sensitive data under GDPR article 9. They are processed only with your explicit consent, given at sign-up and revocable at any time.",
          "Every sensitive field has a visibility level (5 levels) under your control. Testimony, local church, family vision and messages are encrypted at rest (AES-256-GCM).",
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
          "AI coach questions may be processed by a language-model provider (via OpenRouter). No profile data is attached beyond your question, current stage and language.",
        ],
      },
      {
        h: "6. Recipients",
        p: [
          "Hosting: Vercel (EU/US, standard contractual clauses). Database: Supabase, Stockholm region (EU). Transactional email: Resend. Language models: OpenRouter (only the text of your AI-coach questions).",
        ],
      },
      {
        h: "7. Retention",
        p: [
          "Active account: for the duration of use. Deleted account: immediate cascading erasure (profile, messages, journey, portraits, consents). Reports: kept 12 months for safety purposes.",
        ],
      },
      {
        h: "8. Your rights",
        p: [
          "Access and portability: full JSON export in one click (Settings → Privacy → Export my data). Erasure: one-click, real and final account deletion. Objection and consent withdrawal: anytime, free, no justification. Complaint: your local data-protection authority (CNIL in France).",
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
          "We use only cookies essential to running the platform: a secure session cookie (httpOnly, Secure, SameSite) that keeps you signed in, an anti-CSRF token that protects your forms, and small technical preferences (display language, light or dark theme). Without them, authentication and security cannot work.",
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
          "The session cookie expires at the end of your session or after a period of inactivity. Technical preferences (language, theme) are kept until you change or clear them manually. No necessary cookie is kept beyond what its purpose requires.",
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
    updated: "12 de junio de 2026",
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
          "Los acompañantes están verificados (identidad, afiliación, carta). Las sesiones se conciertan directamente contigo; la plataforma no es parte de ese contrato.",
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
          "Puedes eliminar tu cuenta en cualquier momento desde Ajustes → Confidencialidad. La eliminación es real y borra tus datos en cascada.",
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
    updated: "12 de junio de 2026",
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
          "Tus convicciones religiosas, situación familiar, testimonios y mensajes son datos sensibles (art. 9 RGPD). Solo se tratan con tu consentimiento explícito, revocable en todo momento.",
          "Cada campo sensible tiene un nivel de visibilidad (5 niveles) bajo tu control. Testimonio, iglesia local, visión familiar y mensajes se cifran en reposo (AES-256-GCM).",
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
          "Las preguntas al coach IA pueden tratarse por un proveedor de modelos de lenguaje (OpenRouter). No se adjunta ningún dato de perfil más allá de tu pregunta, la etapa y tu idioma.",
        ],
      },
      {
        h: "6. Destinatarios",
        p: [
          "Alojamiento: Vercel (UE/EE. UU., cláusulas contractuales tipo). Base de datos: Supabase, región Estocolmo (UE). Correo transaccional: Resend. Modelos de lenguaje: OpenRouter (solo el texto de tus preguntas).",
        ],
      },
      {
        h: "7. Conservación",
        p: [
          "Cuenta activa: mientras dure el uso. Cuenta eliminada: borrado inmediato en cascada. Denuncias: 12 meses por motivos de seguridad.",
        ],
      },
      {
        h: "8. Tus derechos",
        p: [
          "Acceso y portabilidad: exportación JSON completa con un clic. Supresión: eliminación de cuenta real y definitiva con un clic. Oposición y retirada del consentimiento: en cualquier momento. Reclamación: tu autoridad de protección de datos.",
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
          "Solo usamos cookies imprescindibles para el funcionamiento de la plataforma: una cookie de sesión segura (httpOnly, Secure, SameSite) que te mantiene conectado·a, un token anti-CSRF que protege tus formularios y pequeñas preferencias técnicas (idioma, tema claro u oscuro). Sin ellas, la autenticación y la seguridad no pueden funcionar.",
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
          "La cookie de sesión caduca al final de tu sesión o tras un periodo de inactividad. Las preferencias técnicas (idioma, tema) se conservan hasta que las cambies o las borres manualmente. Ninguna cookie necesaria se conserva más allá de lo útil para su finalidad.",
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
    updated: "12 de junho de 2026",
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
          "Os acompanhantes são verificados (identidade, afiliação, carta). As sessões são acordadas diretamente contigo; a plataforma não é parte nesse contrato.",
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
          "Podes eliminar a tua conta a qualquer momento em Definições → Confidencialidade. A eliminação é real e apaga os teus dados em cascata.",
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
    updated: "12 de junho de 2026",
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
          "As tuas convicções religiosas, situação familiar, testemunhos e mensagens são dados sensíveis (art. 9.º RGPD). Só são tratados com o teu consentimento explícito, revogável a qualquer momento.",
          "Cada campo sensível tem um nível de visibilidade (5 níveis) sob o teu controlo. Testemunho, igreja local, visão familiar e mensagens são cifrados em repouso (AES-256-GCM).",
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
          "As perguntas ao coach IA podem ser tratadas por um fornecedor de modelos de linguagem (OpenRouter). Não é anexado nenhum dado de perfil além da tua pergunta, etapa e idioma.",
        ],
      },
      {
        h: "6. Destinatários",
        p: [
          "Alojamento: Vercel (UE/EUA, cláusulas contratuais-tipo). Base de dados: Supabase, região de Estocolmo (UE). Email transacional: Resend. Modelos de linguagem: OpenRouter (apenas o texto das tuas perguntas).",
        ],
      },
      {
        h: "7. Conservação",
        p: [
          "Conta ativa: durante a utilização. Conta eliminada: apagamento imediato em cascata. Denúncias: 12 meses por razões de segurança.",
        ],
      },
      {
        h: "8. Os teus direitos",
        p: [
          "Acesso e portabilidade: exportação JSON completa num clique. Apagamento: eliminação de conta real e definitiva num clique. Oposição e retirada do consentimento: a qualquer momento. Reclamação: a tua autoridade de proteção de dados (CNPD/CNIL).",
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
          "Usamos apenas cookies indispensáveis ao funcionamento da plataforma: um cookie de sessão seguro (httpOnly, Secure, SameSite) que te mantém ligado·a, um token anti-CSRF que protege os teus formulários e pequenas preferências técnicas (idioma, tema claro ou escuro). Sem eles, a autenticação e a segurança não podem funcionar.",
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
          "O cookie de sessão expira no fim da tua sessão ou após um período de inatividade. As preferências técnicas (idioma, tema) são conservadas até as alterares ou apagares manualmente. Nenhum cookie necessário é conservado além do necessário à sua finalidade.",
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
