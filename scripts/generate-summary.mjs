#!/usr/bin/env node
"use strict";

/**
 * Generateur de rapport d'audit HTML pour Chemin d'Alliance.
 *
 * Lit le rapport JSON de Playwright (reporter "json" -> test-results/results.json)
 * et produit un rapport autonome dans /tmp/qa-report-chemin-alliance.html :
 * synthese (passes/echecs/ignores, taux, duree), matrice des 4 profils,
 * detail par test avec messages d'erreur, et captures embarquees (base64).
 *
 * Usage :
 *   node scripts/generate-summary.mjs
 *   RESULTS=chemin/vers/results.json OUT=/tmp/rapport.html node scripts/generate-summary.mjs
 *
 * Zero dependance : Node fs/path uniquement.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RESULTS_PATH =
  process.env.RESULTS || path.join(ROOT, "test-results", "results.json");
const SHOTS_DIR = process.env.SHOTS || path.join(ROOT, "test-results", "shots");
const OUT_PATH = process.env.OUT || "/tmp/qa-report-chemin-alliance.html";

const BRAND = "#e85d26";

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMs(ms) {
  const n = Number(ms) || 0;
  if (n < 1000) return `${Math.round(n)} ms`;
  const s = n / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s - m * 60)} s`;
}

// Aplatissement recursif des suites Playwright -> liste de tests normalises.
function collectTests(node, fileHint, out) {
  const file = node.file || fileHint || "";
  if (Array.isArray(node.specs)) {
    for (const spec of node.specs) {
      const tests = Array.isArray(spec.tests) ? spec.tests : [];
      // On prend le dernier resultat (apres retries) de chaque "test".
      let status = "unknown";
      let duration = 0;
      let errorMsg = "";
      let project = "";
      for (const t of tests) {
        project = t.projectName || project;
        const results = Array.isArray(t.results) ? t.results : [];
        const last = results[results.length - 1];
        if (last) {
          status = last.status || t.status || "unknown";
          duration += Number(last.duration) || 0;
          if (last.error && (last.error.message || last.error.stack)) {
            errorMsg = last.error.message || last.error.stack;
          } else if (Array.isArray(last.errors) && last.errors.length) {
            errorMsg = last.errors.map((e) => e.message || "").join("\n");
          }
        } else if (t.status) {
          status = t.status;
        }
      }
      if (spec.ok === false && status === "passed") status = "failed";
      out.push({
        title: spec.title || "(sans titre)",
        file: path.basename(file),
        project,
        status: normalizeStatus(status),
        duration,
        error: errorMsg,
      });
    }
  }
  if (Array.isArray(node.suites)) {
    for (const child of node.suites) collectTests(child, file, out);
  }
  return out;
}

function normalizeStatus(s) {
  switch (s) {
    case "passed":
    case "expected":
      return "passed";
    case "skipped":
      return "skipped";
    case "failed":
    case "unexpected":
    case "timedOut":
    case "interrupted":
      return "failed";
    case "flaky":
      return "flaky";
    default:
      return "unknown";
  }
}

function statusMeta(status) {
  switch (status) {
    case "passed":
      return {
        label: "PASSE",
        color: "#1f8b4c",
        bg: "#e8f6ee",
        icon: "&#10003;",
      };
    case "failed":
      return {
        label: "ECHEC",
        color: "#b3261e",
        bg: "#fcebe9",
        icon: "&#10007;",
      };
    case "skipped":
      return {
        label: "IGNORE",
        color: "#8a6d00",
        bg: "#fbf3d8",
        icon: "&#8722;",
      };
    case "flaky":
      return {
        label: "INSTABLE",
        color: "#9a4b00",
        bg: "#fdeede",
        icon: "&#9888;",
      };
    default:
      return { label: "?", color: "#555", bg: "#eee", icon: "?" };
  }
}

function loadResults() {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error(`[generate-summary] introuvable : ${RESULTS_PATH}`);
    console.error(
      "  Lance d'abord :  npx playwright test  (reporter json actif via playwright.config.ts)",
    );
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(RESULTS_PATH, "utf8"));
  } catch (e) {
    console.error(`[generate-summary] JSON illisible : ${e.message}`);
    return null;
  }
}

function embedShots() {
  if (!fs.existsSync(SHOTS_DIR)) return [];
  const shots = [];
  for (const name of fs.readdirSync(SHOTS_DIR).sort()) {
    if (!/\.(png|jpe?g)$/i.test(name)) continue;
    try {
      const buf = fs.readFileSync(path.join(SHOTS_DIR, name));
      const mime = /\.png$/i.test(name) ? "image/png" : "image/jpeg";
      shots.push({
        name,
        dataUri: `data:${mime};base64,${buf.toString("base64")}`,
      });
    } catch {
      /* capture illisible : on l'ignore */
    }
  }
  return shots;
}

function renderRow(t) {
  const m = statusMeta(t.status);
  const err = t.error
    ? `<pre class="err">${escapeHtml(t.error.slice(0, 1200))}</pre>`
    : "";
  return `
    <tr>
      <td><span class="pill" style="color:${m.color};background:${m.bg}">${m.icon} ${m.label}</span></td>
      <td class="title">${escapeHtml(t.title)}${err}</td>
      <td class="file">${escapeHtml(t.file)}</td>
      <td class="dur">${fmtMs(t.duration)}</td>
    </tr>`;
}

function render(data) {
  const tests = collectTests(data, "", []);
  const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0, unknown: 0 };
  let totalDur = 0;
  for (const t of tests) {
    counts[t.status] = (counts[t.status] || 0) + 1;
    totalDur += t.duration;
  }
  const total = tests.length;
  const runnable = total - counts.skipped;
  const rate = runnable > 0 ? Math.round((counts.passed / runnable) * 100) : 0;
  const stats = data.stats || {};
  const wallMs = Number(stats.duration) || totalDur;
  const generatedAt = new Date().toLocaleString("fr-FR");

  const PROFILE_LABELS = [
    "Célibataire A - Homme évangélique",
    "Célibataire B - Femme catholique",
    "Fiancés (Couple C&D)",
    "Mariés (Couple E&F)",
  ];
  const matrix = PROFILE_LABELS.map((label) => {
    const match = tests.find((t) => t.title.includes(label));
    const st = match ? match.status : "unknown";
    const m = statusMeta(st);
    return `<div class="profile">
      <div class="badge" style="color:${m.color};background:${m.bg}">${m.icon}</div>
      <div class="plabel">${escapeHtml(label)}</div>
      <div class="pstatus" style="color:${m.color}">${m.label}</div>
    </div>`;
  }).join("");

  const shots = embedShots();
  const shotsHtml = shots.length
    ? `<section class="card">
        <h2>Captures</h2>
        <div class="shots">
          ${shots
            .map(
              (s) =>
                `<figure><img src="${s.dataUri}" alt="${escapeHtml(s.name)}"/><figcaption>${escapeHtml(s.name)}</figcaption></figure>`,
            )
            .join("")}
        </div>
      </section>`
    : "";

  const overall =
    counts.failed > 0 ? "failed" : counts.passed > 0 ? "passed" : "skipped";
  const overallMeta = statusMeta(overall);

  const rows = tests.length
    ? tests.map(renderRow).join("")
    : `<tr><td colspan="4" class="empty">Aucun test dans le rapport.</td></tr>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Rapport QA - Chemin d'Alliance</title>
<style>
  :root { --brand:${BRAND}; --ink:#1c1a17; --muted:#6b6259; --line:#ece6dc; --bg:#faf7f1; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--ink); background:var(--bg); }
  .wrap { max-width:960px; margin:0 auto; padding:32px 20px 64px; }
  header.hero { background:linear-gradient(135deg,var(--brand),#c9491c); color:#fff; border-radius:18px; padding:28px 30px; box-shadow:0 12px 30px rgba(232,93,38,.25); }
  header.hero h1 { margin:0 0 6px; font-size:26px; letter-spacing:-.3px; }
  header.hero p { margin:0; opacity:.92; font-size:13.5px; }
  .verdict { display:inline-flex; align-items:center; gap:8px; margin-top:14px; padding:7px 14px; border-radius:999px; background:rgba(255,255,255,.16); font-weight:700; font-size:13px; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:22px 0; }
  .kpi { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; text-align:center; }
  .kpi .n { font-size:30px; font-weight:800; line-height:1; }
  .kpi .l { font-size:11.5px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin-top:6px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:20px 22px; margin:18px 0; }
  .card h2 { margin:0 0 14px; font-size:16px; }
  .profiles { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .profile { border:1px solid var(--line); border-radius:12px; padding:14px; text-align:center; }
  .profile .badge { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; margin:0 auto 8px; }
  .profile .plabel { font-size:12px; color:var(--muted); min-height:32px; }
  .profile .pstatus { font-size:12px; font-weight:800; margin-top:4px; }
  table { width:100%; border-collapse:collapse; }
  th,td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:11.5px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); }
  td.dur,td.file { white-space:nowrap; color:var(--muted); font-size:13px; }
  .pill { display:inline-block; padding:3px 9px; border-radius:999px; font-size:11.5px; font-weight:800; white-space:nowrap; }
  .title { font-weight:600; }
  pre.err { margin:8px 0 0; padding:10px; background:#fcebe9; color:#8a2018; border-radius:8px; font-size:12px; white-space:pre-wrap; overflow-x:auto; }
  .shots { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:14px; }
  .shots figure { margin:0; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; }
  .shots img { width:100%; display:block; }
  .shots figcaption { font-size:11.5px; color:var(--muted); padding:8px 10px; }
  .bar { height:10px; border-radius:999px; background:#eee; overflow:hidden; margin-top:10px; }
  .bar > span { display:block; height:100%; background:#1f8b4c; }
  .empty { text-align:center; color:var(--muted); padding:24px; }
  footer { text-align:center; color:var(--muted); font-size:12px; margin-top:30px; }
  @media (max-width:560px) {
    .grid { grid-template-columns:repeat(2,1fr); }
    .profiles { grid-template-columns:repeat(2,1fr); }
    th.col-file, td.file { display:none; }
    header.hero h1 { font-size:22px; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>Rapport d'audit QA - Chemin d'Alliance</h1>
      <p>Genere le ${escapeHtml(generatedAt)} &middot; source : ${escapeHtml(path.basename(RESULTS_PATH))}</p>
      <div class="verdict">${overallMeta.icon}&nbsp; Verdict global : ${overallMeta.label} &middot; ${rate}% de reussite</div>
    </header>

    <div class="grid">
      <div class="kpi"><div class="n">${total}</div><div class="l">Tests</div></div>
      <div class="kpi"><div class="n" style="color:#1f8b4c">${counts.passed}</div><div class="l">Passes</div></div>
      <div class="kpi"><div class="n" style="color:#b3261e">${counts.failed}</div><div class="l">Echecs</div></div>
      <div class="kpi"><div class="n" style="color:#8a6d00">${counts.skipped}</div><div class="l">Ignores</div></div>
    </div>

    <section class="card">
      <h2>Taux de reussite (hors ignores) &middot; duree ${fmtMs(wallMs)}</h2>
      <div class="bar"><span style="width:${rate}%"></span></div>
    </section>

    <section class="card">
      <h2>Matrice des 4 profils</h2>
      <div class="profiles">${matrix}</div>
    </section>

    <section class="card">
      <h2>Detail des tests</h2>
      <table>
        <thead><tr><th>Statut</th><th>Test</th><th class="col-file">Fichier</th><th>Duree</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>

    ${shotsHtml}

    <footer>Chemin d'Alliance &middot; rapport autonome (aucune dependance externe)</footer>
  </div>
</body>
</html>`;
}

function main() {
  const data = loadResults();
  if (!data) process.exit(1);
  const html = render(data);
  fs.writeFileSync(OUT_PATH, html, "utf8");
  const tests = collectTests(data, "", []);
  const failed = tests.filter((t) => t.status === "failed").length;
  console.log(
    `[generate-summary] ${tests.length} test(s), ${failed} echec(s).`,
  );
  console.log(`[generate-summary] Rapport ecrit : ${OUT_PATH}`);
}

main();
