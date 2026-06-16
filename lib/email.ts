import { env } from "@/lib/env";
import type { Locale } from "@/lib/core-engine";

/**
 * Email transactionnel via Resend (domaine vérifié kolosaltech.com).
 * Sans RESEND_API_KEY : le lien est loggé côté serveur (mode dev).
 */
const SUBJECTS: Record<Locale, string> = {
  fr: "Vérifie ton adresse — Chemin d'Alliance",
  en: "Verify your address — Chemin d'Alliance",
  es: "Verifica tu dirección — Chemin d'Alliance",
  pt: "Verifica o teu endereço — Chemin d'Alliance",
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

async function sendViaResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html }),
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
  const link = `${env.APP_URL}/api/auth/verify-email?token=${token}`;
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
  fr: "Réinitialise ton mot de passe — Chemin d'Alliance",
  en: "Reset your password — Chemin d'Alliance",
  es: "Restablece tu contraseña — Chemin d'Alliance",
  pt: "Redefine a tua palavra-passe — Chemin d'Alliance",
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
 * page (locale) /reset-password?token=… où le membre saisit un nouveau MDP.
 * Jamais d'échec visible : panne fournisseur -> trace serveur (mode dev).
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  locale: Locale = "fr",
) {
  const link = `${env.APP_URL}/${locale}/reset-password?token=${token}`;
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
