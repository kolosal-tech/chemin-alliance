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

const BODIES: Record<Locale, { title: string; body: string; cta: string; ignore: string }> = {
  fr: {
    title: "Bienvenue sur le chemin",
    body: "Une dernière étape avant de commencer : confirme ton adresse email pour protéger ton compte.",
    cta: "Vérifier mon adresse",
    ignore: "Si tu n'es pas à l'origine de cette inscription, ignore simplement cet email.",
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
