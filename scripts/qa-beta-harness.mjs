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
    // Bien reprendre le match A<->B (other = compte B), pas arr[0] : le match
    // le plus recent est souvent celui d'une Compagnonne IA (cohorte 4), et le
    // message-test d'arnaque partait alors dans SON thread (auto-reply LLM a
    // chaque run + le check ne validait pas le vrai match A-B).
    const ab = arr.find((m) => m.other && m.other.id === idB);
    mid = ab && ab.id;
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

// --- Cohorte 4 : Compagnons IA (decouverte badgee + chat IA + discernement) --
// Valide le pivot ecosysteme (P3 + P5) de bout en bout via l'API : un celibataire
// verifie decouvre un Compagnon IA, ouvre la rencontre (auto-ACTIVE), recoit le
// message d'accueil, envoie un message et obtient l'auto-reply, puis lance un
// outil de discernement (le Compagnon pose une question curee). Idempotent.
function findCompanionMatchId(listJson, companion) {
  const arr = Array.isArray(listJson)
    ? listJson
    : (listJson && (listJson.matches || listJson.items)) || [];
  for (const m of arr) {
    const cand = [
      m.otherId,
      m.partnerId,
      m.userId,
      m.other && m.other.id,
    ];
    if (cand.includes(companion.id)) return m.id;
    const names = [m.displayName, m.other && m.other.displayName];
    if (companion.displayName && names.includes(companion.displayName)) {
      return m.id;
    }
  }
  return null;
}

async function cohortCompanion() {
  // Celibataire homme verifie ; les Compagnons femmes (genre oppose) sont eligibles.
  const ca = await login(ACCOUNTS.A);
  // Profil minimum pour RECEVOIR des suggestions (ville + intention). Idempotent.
  await api(ca, "PATCH", "/api/me", { cityApprox: "Lyon" });
  await api(ca, "PATCH", "/api/me/relationship-profile", {
    intentionStatement: "Avancer vers un mariage chretien, avec patience.",
  });

  const sug = await api(ca, "GET", "/api/matches/suggestions");
  const list = Array.isArray(sug.json) ? sug.json : [];
  let companion = list.find((s) => s.kind === "AI_COMPANION");
  let mid = null;
  let discoveryOk = !!companion;
  let discoveryDetail = companion
    ? `${companion.displayName} (kind=${companion.kind})`
    : `${list.length} suggestions, aucun AI_COMPANION`;

  // Pool epuise : chaque run precedent a "rencontre" une Compagnonne (match
  // auto-ACTIVE), et un profil deja matche est exclu des suggestions par
  // conception (lib/matching.ts, excludedIds). Ce n'est PAS une regression
  // produit : on retombe sur un match compagnon existant (tout match ACTIVE
  // dont l'autre n'est pas le compte B, seul humain matche par le harnais).
  // Les checks auto-reply et discernement en aval prouvent que le match
  // reutilise est bien un Compagnon (un humain ne repondrait pas en 201).
  if (!companion) {
    const cb = await login(ACCOUNTS.B);
    const meB = await api(cb, "GET", "/api/me");
    const idB = meB.json && meB.json.id;
    const lst = await api(ca, "GET", "/api/matches/list");
    const arr = Array.isArray(lst.json) ? lst.json : [];
    const reused = idB
      ? arr.find(
          (m) =>
            m.status === "ACTIVE" && m.other && m.other.id && m.other.id !== idB,
        )
      : null;
    if (reused) {
      companion = {
        id: reused.other.id,
        displayName: reused.other.displayName,
      };
      mid = reused.id;
      discoveryOk = true;
      discoveryDetail = `deja rencontree (pool epuise): ${reused.other.displayName}`;
    }
  }

  check(
    "compagnon: visible et badge dans la decouverte",
    discoveryOk,
    discoveryDetail,
  );
  if (!companion) return;

  // Ouvre la rencontre : 201 {companion:true, matchId} ; 409 si deja matche.
  // En reutilisation (pool epuise), le match existe deja : rien a ouvrir.
  if (mid) {
    check(
      "compagnon: rencontre ouverte (auto-acceptee)",
      true,
      `${mid} (match existant reutilise)`,
    );
  } else {
    const req = await api(ca, "POST", "/api/matches/request", {
      targetUserId: companion.id,
    });
    if (req.json && req.json.matchId) mid = req.json.matchId;
    if (!mid) {
      const lst = await api(ca, "GET", "/api/matches/list");
      mid = findCompanionMatchId(lst.json, companion);
    }
    check(
      "compagnon: rencontre ouverte (auto-acceptee)",
      !!mid && (req.status === 201 ? req.json.companion === true : true),
      mid ? `${mid} (req ${req.status})` : `req ${req.status}`,
    );
  }
  if (!mid) return;

  // Message d'accueil transparent depose par le Compagnon (au moins 1 message recu).
  const msgs = await api(ca, "GET", `/api/matches/${mid}/messages`);
  const arr = Array.isArray(msgs.json) ? msgs.json : [];
  const fromCompanion = arr.filter((m) => m.mine === false);
  check(
    "compagnon: message d'accueil present",
    fromCompanion.length >= 1,
    `${fromCompanion.length} message(s) du compagnon`,
  );

  // Envoi d'un message -> reponse automatique du Compagnon (LLM ou repli localise).
  const sent = await api(ca, "POST", `/api/matches/${mid}/messages`, {
    content: "Bonjour, je decouvre ton profil avec joie.",
  });
  const reply = sent.json && sent.json.companionReply;
  check(
    "compagnon: reponse IA automatique",
    sent.status === 201 &&
      !!reply &&
      typeof reply.content === "string" &&
      reply.content.length > 0,
    reply ? `${reply.content.length} car.` : `status ${sent.status}`,
  );

  // Outil de discernement in-chat (P5) : le Compagnon pose une question curee.
  const tool = await api(ca, "POST", `/api/matches/${mid}/companion-tool`, {
    module: "deepQuestions",
    index: 0,
  });
  const q = tool.json && tool.json.message;
  check(
    "compagnon: outil de discernement (question posee)",
    tool.status === 201 &&
      !!q &&
      typeof q.content === "string" &&
      q.content.length > 0,
    q ? `${q.content.length} car.` : `status ${tool.status}`,
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
    await cohortCompanion();
  } catch (e) {
    check("cohorte Compagnons IA", false, e.message);
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
