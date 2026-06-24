import { env } from "@/lib/env";
import type { Locale } from "@/lib/core-engine";

/**
 * Email transactionnel via Resend (domaine vérifié kolosaltech.com).
 * Sans RESEND_API_KEY : le lien est loggé côté serveur (mode dev).
 */
const SUBJECTS: Record<Locale, string> = {
  fr: "Vérifie ton adresse - Chemin d'Alliance",
  en: "Verify your address - Chemin d'Alliance",
  es: "Verifica tu dirección - Chemin d'Alliance",
  pt: "Verifica o teu endereço - Chemin d'Alliance",
};

const BODIES: Record<
  Locale,
  { title: string; body: string; cta: string; ignore: string }
> = {
  fr: {
    title: "Bienvenue sur le chemin",
    body: "Une dernière étape avant de commencer : confirme ton adresse email pour protéger ton compte.",
    cta: "Vérifier mon adresse",
    ignore:
      "Si tu n'es pas à l'origine de cette inscription, ignore simplement cet email.",
  },
  en: {
    title: "Welcome to the path",
    body: "One last step before you begin: confirm your email address to protect your account.",
    cta: "Verify my address",
    ignore: "If you didn't sign up, simply ignore this email.",
  },
  es: {
    title: "Bienvenido/a al camino",
    body: "Un último paso antes de comenzar: confirma tu correo para proteger tu cuenta.",
    cta: "Verificar mi dirección",
    ignore: "Si no te registraste, simplemente ignora este correo.",
  },
  pt: {
    title: "Bem-vindo/a ao caminho",
    body: "Um último passo antes de começar: confirma o teu email para proteger a tua conta.",
    cta: "Verificar o meu endereço",
    ignore: "Se não te registaste, ignora simplesmente este email.",
  },
};

function verificationHtml(link: string, locale: Locale): string {
  const t = BODIES[locale] ?? BODIES.fr;
  return `<!doctype html><html><body style="margin:0;background:#F7F5F0;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:.16em;color:#9A7B2E;text-transform:uppercase;">
      &mdash;&mdash; Chemin d'Alliance
    </div>
    <div style="background:#131D33;border-radius:18px;padding:36px 32px;margin-top:18px;">
      <h1 style="font-weight:400;font-size:28px;line-height:1.2;color:#F4F1EA;margin:0;">${t.title}</h1>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#A6AEC0;margin:18px 0 28px;">${t.body}</p>
      <a href="${link}" style="display:inline-block;background:#C9A84C;color:#131D33;font-family:Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">${t.cta}</a>
    </div>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8B8579;margin-top:18px;">${t.ignore}</p>
  </div></body></html>`;
}

// Adresse nue extraite de EMAIL_FROM ("Nom <addr@dom>" -> "addr@dom").
const FROM_ADDRESS = env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.EMAIL_FROM;

// Partie texte derivee du HTML : Gmail penalise les emails HTML-only. On
// conserve le lien (href) et on aplatit le reste en texte lisible.
function htmlToText(html: string): string {
  const link = html.match(/href="([^"]+)"/)?.[1];
  const body = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return link ? `${body}\n\n${link}` : body;
}

async function sendViaResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      html,
      // Levier delivrabilite #1 : une partie texte (multipart) reduit le score
      // spam Gmail. reply_to + List-Unsubscribe (mailto, un-clic) sont des
      // signaux positifs supplementaires. SPF/DKIM/DMARC restent cote DNS.
      text: htmlToText(html),
      reply_to: env.EMAIL_FROM,
      headers: {
        "List-Unsubscribe": `<mailto:${FROM_ADDRESS}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.ok;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  locale: Locale = "fr",
) {
  // Segment de chemin (pas `?token=`) : le `=` est corrompu par l'encodage
  // quoted-printable des emails (`=11` -> octet 0x11), ce qui cassait le lien.
  const link = `${env.APP_URL}/api/auth/verify-email/${token}`;
  if (env.RESEND_API_KEY) {
    const ok = await sendViaResend(
      email,
      SUBJECTS[locale] ?? SUBJECTS.fr,
      verificationHtml(link, locale),
    );
    if (ok) return;
    // panne fournisseur -> trace serveur, l'inscription n'échoue jamais pour ça
  }
  console.info(`\n[email] Lien de vérification pour ${email} :\n${link}\n`);
}

// --- Invitation à rejoindre l'espace couple (code partagé au conjoint/fiancé·e) ---

const INVITE_SUBJECTS: Record<Locale, (name: string) => string> = {
  fr: (n) => `${n} t'invite sur Chemin d'Alliance`,
  en: (n) => `${n} invites you to Chemin d'Alliance`,
  es: (n) => `${n} te invita a Chemin d'Alliance`,
  pt: (n) => `${n} convida-te para o Chemin d'Alliance`,
};

const INVITE_BODIES: Record<
  Locale,
  {
    title: (n: string) => string;
    intro: string;
    codeLabel: string;
    steps: string;
    cta: string;
    ignore: string;
  }
> = {
  fr: {
    title: (n) => `${n} t'invite à cheminer à deux`,
    intro:
      "Vous êtes invité·e à rejoindre un espace privé sur Chemin d'Alliance, pour avancer ensemble et accompagnés.",
    codeLabel: "Votre code d'invitation",
    steps:
      "Crée ton compte, puis saisis ce code dans « Espace Couple » pour rejoindre votre espace.",
    cta: "Créer mon compte",
    ignore: "Si tu ne connais pas cette personne, ignore simplement cet email.",
  },
  en: {
    title: (n) => `${n} invites you to walk together`,
    intro:
      "You're invited to join a private space on Chemin d'Alliance, to move forward together and supported.",
    codeLabel: "Your invitation code",
    steps:
      "Create your account, then enter this code in “Couple Space” to join your shared space.",
    cta: "Create my account",
    ignore: "If you don't know this person, simply ignore this email.",
  },
  es: {
    title: (n) => `${n} te invita a caminar juntos`,
    intro:
      "Estás invitado/a a unirte a un espacio privado en Chemin d'Alliance, para avanzar juntos y acompañados.",
    codeLabel: "Tu código de invitación",
    steps:
      "Crea tu cuenta y luego introduce este código en «Espacio Pareja» para uniros a vuestro espacio.",
    cta: "Crear mi cuenta",
    ignore: "Si no conoces a esta persona, simplemente ignora este correo.",
  },
  pt: {
    title: (n) => `${n} convida-te a caminhar a dois`,
    intro:
      "Estás convidado/a a entrar num espaço privado no Chemin d'Alliance, para avançarem juntos e acompanhados.",
    codeLabel: "O teu código de convite",
    steps:
      "Cria a tua conta e depois introduz este código em «Espaço Casal» para entrarem no vosso espaço.",
    cta: "Criar a minha conta",
    ignore: "Se não conheces esta pessoa, ignora simplesmente este email.",
  },
};

function inviteHtml(
  name: string,
  code: string,
  link: string,
  locale: Locale,
): string {
  const t = INVITE_BODIES[locale] ?? INVITE_BODIES.fr;
  return `<!doctype html><html><body style="margin:0;background:#F7F5F0;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:.16em;color:#9A7B2E;text-transform:uppercase;">
      &mdash;&mdash; Chemin d'Alliance
    </div>
    <div style="background:#131D33;border-radius:18px;padding:36px 32px;margin-top:18px;">
      <h1 style="font-weight:400;font-size:26px;line-height:1.25;color:#F4F1EA;margin:0;">${t.title(name)}</h1>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#A6AEC0;margin:18px 0 24px;">${t.intro}</p>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:8px;">${t.codeLabel}</div>
      <div style="font-family:monospace;font-size:24px;letter-spacing:.18em;color:#F4F1EA;background:#0C1424;border:1px solid #2A3550;border-radius:12px;padding:16px 20px;text-align:center;">${code}</div>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#A6AEC0;margin:24px 0 28px;">${t.steps}</p>
      <a href="${link}" style="display:inline-block;background:#C9A84C;color:#131D33;font-family:Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">${t.cta}</a>
    </div>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8B8579;margin-top:18px;">${t.ignore}</p>
  </div></body></html>`;
}

/**
 * Envoie le code d'invitation de l'espace couple à l'email du conjoint/fiancé·e.
 * Renvoie true si l'email part (Resend), false sinon (l'appelant peut alors
 * inviter l'utilisateur à copier le code manuellement).
 */
export async function sendCoupleInviteEmail(
  to: string,
  inviterName: string,
  code: string,
  locale: Locale = "fr",
): Promise<boolean> {
  const link = `${env.APP_URL}/${locale}/register`;
  if (env.RESEND_API_KEY) {
    const subject = (INVITE_SUBJECTS[locale] ?? INVITE_SUBJECTS.fr)(
      inviterName,
    );
    const ok = await sendViaResend(
      to,
      subject,
      inviteHtml(inviterName, code, link, locale),
    );
    if (ok) return true;
  }
  console.info(`\n[email] Invitation couple pour ${to} (code ${code})\n`);
  return false;
}

// --- Réinitialisation de mot de passe (jeton à usage unique, expiration 1 h) ---

const RESET_SUBJECTS: Record<Locale, string> = {
  fr: "Réinitialise ton mot de passe - Chemin d'Alliance",
  en: "Reset your password - Chemin d'Alliance",
  es: "Restablece tu contraseña - Chemin d'Alliance",
  pt: "Redefine a tua palavra-passe - Chemin d'Alliance",
};

const RESET_BODIES: Record<
  Locale,
  { title: string; body: string; cta: string; ignore: string }
> = {
  fr: {
    title: "Réinitialise ton mot de passe",
    body: "Tu as demandé à changer ton mot de passe. Ce lien est valable 1 heure. Clique pour en choisir un nouveau.",
    cta: "Choisir un nouveau mot de passe",
    ignore:
      "Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe reste inchangé.",
  },
  en: {
    title: "Reset your password",
    body: "You asked to change your password. This link is valid for 1 hour. Click to choose a new one.",
    cta: "Choose a new password",
    ignore:
      "If you didn't request this, ignore this email: your password stays unchanged.",
  },
  es: {
    title: "Restablece tu contraseña",
    body: "Pediste cambiar tu contraseña. Este enlace es válido 1 hora. Haz clic para elegir una nueva.",
    cta: "Elegir una nueva contraseña",
    ignore:
      "Si no lo solicitaste, ignora este correo: tu contraseña no cambia.",
  },
  pt: {
    title: "Redefine a tua palavra-passe",
    body: "Pediste para mudar a tua palavra-passe. Este link é válido durante 1 hora. Clica para escolher uma nova.",
    cta: "Escolher uma nova palavra-passe",
    ignore:
      "Se não foste tu a pedir, ignora este email: a tua palavra-passe não muda.",
  },
};

function resetHtml(link: string, locale: Locale): string {
  const t = RESET_BODIES[locale] ?? RESET_BODIES.fr;
  return `<!doctype html><html><body style="margin:0;background:#F7F5F0;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:.16em;color:#9A7B2E;text-transform:uppercase;">
      &mdash;&mdash; Chemin d'Alliance
    </div>
    <div style="background:#131D33;border-radius:18px;padding:36px 32px;margin-top:18px;">
      <h1 style="font-weight:400;font-size:28px;line-height:1.2;color:#F4F1EA;margin:0;">${t.title}</h1>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#A6AEC0;margin:18px 0 28px;">${t.body}</p>
      <a href="${link}" style="display:inline-block;background:#C9A84C;color:#131D33;font-family:Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">${t.cta}</a>
    </div>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8B8579;margin-top:18px;">${t.ignore}</p>
  </div></body></html>`;
}

/**
 * Envoie le lien de réinitialisation de mot de passe. Le lien pointe vers la
 * page (locale) /reset-password/<token> où le membre saisit un nouveau MDP.
 * Jamais d'échec visible : panne fournisseur -> trace serveur (mode dev).
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  locale: Locale = "fr",
) {
  // Segment de chemin (pas `?token=`) : même corruption quoted-printable du `=`.
  const link = `${env.APP_URL}/${locale}/reset-password/${token}`;
  if (env.RESEND_API_KEY) {
    const ok = await sendViaResend(
      email,
      RESET_SUBJECTS[locale] ?? RESET_SUBJECTS.fr,
      resetHtml(link, locale),
    );
    if (ok) return;
  }
  console.info(`\n[email] Lien de réinitialisation pour ${email} :\n${link}\n`);
}

// --- Demande de bénédiction au Parrain / Marraine (lien magique) ---

const BLESSING_SUBJECTS: Record<Locale, (filleul: string) => string> = {
  fr: (n) => `${n} demande votre bénédiction`,
  en: (n) => `${n} is asking for your blessing`,
  es: (n) => `${n} pide tu bendición`,
  pt: (n) => `${n} pede a sua bênção`,
};

const BLESSING_BODIES: Record<
  Locale,
  {
    greeting: (s: string) => string;
    intro: string;
    cta: string;
    ignore: string;
  }
> = {
  fr: {
    greeting: (s) => `Bonjour ${s},`,
    intro:
      "Votre filleul·e vous a choisi·e comme Parrain/Marraine sur Chemin d'Alliance et sollicite votre bénédiction avant d'avancer dans une mise en relation. Vous pouvez bénir ce pas ou conseiller la prudence, en quelques mots.",
    cta: "Donner ma réponse",
    ignore:
      "Si vous ne connaissez pas cette personne, ignorez simplement cet email.",
  },
  en: {
    greeting: (s) => `Hello ${s},`,
    intro:
      "Your godchild chose you as their Sponsor on Chemin d'Alliance and is asking for your blessing before moving forward with a connection. You can bless this step or advise caution, in a few words.",
    cta: "Give my answer",
    ignore: "If you don't know this person, simply ignore this email.",
  },
  es: {
    greeting: (s) => `Hola ${s},`,
    intro:
      "Tu ahijado·a te eligió como Padrino/Madrina en Chemin d'Alliance y pide tu bendición antes de avanzar en una relación. Puedes bendecir este paso o aconsejar prudencia, en unas palabras.",
    cta: "Dar mi respuesta",
    ignore: "Si no conoces a esta persona, ignora este correo.",
  },
  pt: {
    greeting: (s) => `Olá ${s},`,
    intro:
      "O seu afilhado·a escolheu-o·a como Padrinho/Madrinha no Chemin d'Alliance e pede a sua bênção antes de avançar numa ligação. Pode abençoar este passo ou aconselhar prudência, em poucas palavras.",
    cta: "Dar a minha resposta",
    ignore: "Se não conhece esta pessoa, ignore este email.",
  },
};

function blessingHtml(
  sponsorName: string,
  filleulName: string,
  link: string,
  locale: Locale,
): string {
  const t = BLESSING_BODIES[locale] ?? BLESSING_BODIES.fr;
  const title = (BLESSING_SUBJECTS[locale] ?? BLESSING_SUBJECTS.fr)(
    filleulName,
  );
  return `<!doctype html><html><body style="margin:0;background:#F7F5F0;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:.16em;color:#9A7B2E;text-transform:uppercase;">
      &mdash;&mdash; Chemin d'Alliance
    </div>
    <div style="background:#131D33;border-radius:18px;padding:36px 32px;margin-top:18px;">
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#C9A84C;margin:0 0 10px;">${t.greeting(sponsorName)}</p>
      <h1 style="font-weight:400;font-size:26px;line-height:1.2;color:#F4F1EA;margin:0;">${title}</h1>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#A6AEC0;margin:18px 0 28px;">${t.intro}</p>
      <a href="${link}" style="display:inline-block;background:#C9A84C;color:#131D33;font-family:Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">${t.cta}</a>
    </div>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8B8579;margin-top:18px;">${t.ignore}</p>
  </div></body></html>`;
}

// --- Notification : demande de mise en relation acceptée ---

const MATCH_ACCEPTED_SUBJECTS: Record<Locale, (name: string) => string> = {
  fr: (n) => `${n} a accepté ta demande - Chemin d'Alliance`,
  en: (n) => `${n} accepted your request - Chemin d'Alliance`,
  es: (n) => `${n} aceptó tu solicitud - Chemin d'Alliance`,
  pt: (n) => `${n} aceitou o teu pedido - Chemin d'Alliance`,
};

const MATCH_ACCEPTED_BODIES: Record<
  Locale,
  { title: string; body: (n: string) => string; cta: string }
> = {
  fr: {
    title: "Une rencontre commence",
    body: (n) =>
      `${n} a accepté ta demande de mise en relation. Vous pouvez maintenant commencer à vous découvrir, à votre rythme.`,
    cta: "Ouvrir la conversation",
  },
  en: {
    title: "A meeting begins",
    body: (n) =>
      `${n} has accepted your connection request. You can now start getting to know each other, at your own pace.`,
    cta: "Open the conversation",
  },
  es: {
    title: "Un encuentro comienza",
    body: (n) =>
      `${n} ha aceptado tu solicitud de contacto. Podéis empezar a conoceros ahora, a vuestro ritmo.`,
    cta: "Abrir la conversación",
  },
  pt: {
    title: "Um encontro começa",
    body: (n) =>
      `${n} aceitou o teu pedido de ligação. Podem começar agora a conhecer-se, ao vosso ritmo.`,
    cta: "Abrir a conversa",
  },
};

function matchAcceptedHtml(
  acceptorName: string,
  matchId: string,
  locale: Locale,
): string {
  const t = MATCH_ACCEPTED_BODIES[locale] ?? MATCH_ACCEPTED_BODIES.fr;
  const link = `${env.APP_URL}/${locale}/messages/${matchId}`;
  return `<!doctype html><html><body style="margin:0;background:#F7F5F0;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:.16em;color:#9A7B2E;text-transform:uppercase;">
      &mdash;&mdash; Chemin d'Alliance
    </div>
    <div style="background:#131D33;border-radius:18px;padding:36px 32px;margin-top:18px;">
      <h1 style="font-weight:400;font-size:28px;line-height:1.2;color:#F4F1EA;margin:0;">${t.title}</h1>
      <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#A6AEC0;margin:18px 0 28px;">${t.body(acceptorName)}</p>
      <a href="${link}" style="display:inline-block;background:#C9A84C;color:#131D33;font-family:Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">${t.cta}</a>
    </div>
  </div></body></html>`;
}

/** Notifie le demandeur que sa demande de mise en relation a été acceptée. */
export async function sendMatchAcceptedEmail(
  to: string,
  acceptorName: string,
  matchId: string,
  locale: Locale = "fr",
): Promise<void> {
  const subject = (
    MATCH_ACCEPTED_SUBJECTS[locale] ?? MATCH_ACCEPTED_SUBJECTS.fr
  )(acceptorName);
  if (env.RESEND_API_KEY) {
    const ok = await sendViaResend(
      to,
      subject,
      matchAcceptedHtml(acceptorName, matchId, locale),
    );
    if (ok) return;
  }
  console.info(
    `\n[email] Match accepté pour ${to} (accepteur ${acceptorName}, matchId ${matchId})\n`,
  );
}

/** Email au Parrain/Marraine : demande de bénédiction avec lien magique. */
export async function sendBlessingRequestEmail(
  to: string,
  sponsorName: string,
  filleulName: string,
  link: string,
  locale: Locale = "fr",
): Promise<boolean> {
  if (env.RESEND_API_KEY) {
    const subject = (BLESSING_SUBJECTS[locale] ?? BLESSING_SUBJECTS.fr)(
      filleulName,
    );
    const ok = await sendViaResend(
      to,
      subject,
      blessingHtml(sponsorName, filleulName, link, locale),
    );
    if (ok) return true;
  }
  console.info(
    `\n[email] Demande de bénédiction pour ${to} (filleul·e ${filleulName}) :\n${link}\n`,
  );
  return false;
}
