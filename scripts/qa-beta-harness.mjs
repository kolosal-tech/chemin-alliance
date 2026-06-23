#!/usr/bin/env node
"use strict";

/**
 * Harnais bêta-testeur réutilisable - Chemin d'Alliance.
 *
 * Rejoue, contre une instance LIVE (prod par défaut), les parcours des 3
 * cohortes avec 6 comptes de test DÉJÀ VÉRIFIÉS (la vérification email passe
 * par un lien reçu par mail, non scriptable ici - on réutilise donc des
 * comptes vérifiés une fois à la main). Idempotent : réutilise matches et
 * espaces couple existants. Sort 0 si tout passe, 1 sinon (pour un cron).
 *
 * Cohortes :
 *  1. Célibataires A<->B : profils complets -> match -> message -> le Watchman
 *     détecte un message d'arnaque ("Western Union").
 *  2. Fiancés/Mariés C+D : espace couple ACTIVE -> check-in Pasteur IA répond.
 *  3. Mariés E+F : idem.
 *
 * Usage :
 *   QA_PASSWORD='...' node scripts/qa-beta-harness.mjs
 *   QA_BASE_URL=https://chemin-alliance.vercel.app QA_PASSWORD='...' node scripts/qa-beta-harness.mjs
 *
 * Variables d'env :
 *   QA_PASSWORD (requis)  mot de passe partagé des comptes de test
 *   QA_BASE_URL           défaut https://chemin-alliance.vercel.app
 *   QA_A..QA_F            override des emails (défauts: alias mrkolosal+caqa*)
 *
 * Cron (toutes les 6 h, exemple) :
 *   0 0,6,12,18 * * * QA_PASSWORD='...' node /chemin/app/scripts/qa-beta-harness.mjs >> /tmp/qa-harness.log 2>&1
 */

const BASE = process.env.QA_BASE_URL || "https://chemin-alliance.vercel.app";
const PW = process.env.QA_PASSWORD;
if (!PW) {
  console.error("QA_PASSWORD requis (mot de passe partagé des comptes de test).");
  process.exit(2);
}

const ACCOUNTS = {
  A: process.env.QA_A || "mrkolosal+caqa1@gmail.com", // célibataire homme
  B: process.env.QA_B || "mrkolosal+caqa2@gmail.com", // célibataire femme
  C: process.env.QA_C || "mrkolosal+caqac@gmail.com", // couple (créateur)
  D: process.env.QA_D || "mrkolosal+caqad@gmail.com", // couple (conjoint)
  E: process.env.QA_E || "mrkolosal+caqae@gmail.com", // couple (créateur)
  F: process.env.QA_F || "mrkolosal+caqaf@gmail.com", // couple (conjoint)
};

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PW }),
    redirect: "manual",
  });
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const cookie = set.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`login ${email} -> ${res.status} (pas de cookie)`);
  return cookie;
}

async function api(cookie, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* réponse sans corps JSON */
  }
  return { status: res.status, json };
}

// --- Cohorte 1 : célibataires A<->B (match + messagerie + Watchman) ----------
async function cohortSingles() {
  const ca = await login(ACCOUNTS.A);
  const cb = await login(ACCOUNTS.B);

  // Profils découvrables (ville + intention). Idempotent.
  await api(ca, "PATCH", "/api/me", { cityApprox: "Lyon" });
  await api(ca, "PATCH", "/api/me/relationship-profile", {
    intentionStatement: "Avancer vers un mariage chretien, avec patience.",
  });
  await api(cb, "PATCH", "/api/me", { cityApprox: "Paris" });
  await api(cb, "PATCH", "/api/me/relationship-profile", {
    intentionStatement: "Construire une relation sincere, dans la foi.",
  });

  const meB = await api(cb, "GET", "/api/me");
  const idB = meB.json && meB.json.id;

  // Match : créer, ou réutiliser l'existant (409 MATCH_EXISTS).
  let mid;
  const req = await api(ca, "POST", "/api/matches/request", {
    targetUserId: idB,
  });
  if (req.json && req.json.matchId) mid = req.json.matchId;
  if (!mid) {
    const list = await api(ca, "GET", "/api/matches/list");
    const arr = Array.isArray(list.json)
      ? list.json
      : (list.json && list.json.matches) || [];
    mid = arr[0] && arr[0].id;
  }
  check("singles: match A-B disponible", !!mid, mid ? mid : `req ${req.status}`);
  if (!mid) return;

  // Accepte côté B (sans effet si déjà ACTIVE).
  await api(cb, "POST", `/api/matches/${mid}/accept`, {});

  const m1 = await api(ca, "POST", `/api/matches/${mid}/messages`, {
    content: "Bonjour, ravi de faire ta connaissance.",
  });
  check("singles: message envoyé", m1.status === 201, `status ${m1.status}`);

  await api(ca, "POST", `/api/matches/${mid}/messages`, {
    content: "Peux-tu m'envoyer 300 euros par Western Union, c'est urgent ?",
  });
  const sig = await api(ca, "GET", `/api/matches/${mid}/safety-signal`);
  const flagged =
    sig.json && sig.json.flagged === true && sig.json.severity === "high";
  check("singles: Watchman détecte l'arnaque", !!flagged, JSON.stringify(sig.json));
}

// --- Cohortes 2 & 3 : couples (espace + check-in Pasteur IA) -----------------
async function cohortCouple(label, email) {
  const c = await login(email);
  const sp = await api(c, "GET", "/api/couple");
  const space = sp.json && sp.json.space;
  check(
    `${label}: espace couple ACTIVE`,
    !!(space && space.status === "ACTIVE"),
    space ? `season ${space.season}, partenaire ${space.partner}` : "pas d'espace",
  );

  const questions = (sp.json && sp.json.questions) || [];
  if (!questions.length) {
    check(`${label}: check-in Pasteur IA`, false, "aucune question");
    return;
  }
  // "no" aux questions de sujet évité (chk_*unspoken*), "yes" sinon.
  const answers = questions.map((q) => ({
    id: q.id,
    value: /unspoken/.test(q.id) ? "no" : "yes",
    note: "",
  }));
  const ck = await api(c, "POST", "/api/agents/guardian/checkin", { answers });
  const word = ck.json && ck.json.word;
  check(
    `${label}: Pasteur IA check-in répond`,
    ck.status === 200 && typeof word === "string" && word.length > 0,
    typeof word === "string" ? `${word.length} car.` : `status ${ck.status}`,
  );
}

(async () => {
  console.log(`# Harnais QA bêta-testeur — ${BASE}`);
  console.log(`# ${new Date().toISOString()}\n`);
  try {
    await cohortSingles();
  } catch (e) {
    check("cohorte célibataires", false, e.message);
  }
  try {
    await cohortCouple("couple C+D", ACCOUNTS.C);
  } catch (e) {
    check("cohorte C+D", false, e.message);
  }
  try {
    await cohortCouple("couple E+F", ACCOUNTS.E);
  } catch (e) {
    check("cohorte E+F", false, e.message);
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n## ${passed}/${total} checks OK`);
  process.exit(passed === total ? 0 : 1);
})();
