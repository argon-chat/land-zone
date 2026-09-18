#!/usr/bin/env bun
// Fails the build when a response a visitor actually loads would not survive Russian transit.
//
// Russian transit throttles a Cloudflare connection once a response passes a fixed size:
// measured from a St. Petersburg exit (AS42065, 2026-09-18) the cut is at 19139 bytes on
// HTTP/2 — what browsers use — and 24162 on HTTP/1.1, after which throughput collapses to
// ~637 B/s and never recovers. A page one byte over the line simply never finishes loading
// for those visitors, and nothing in a normal CI run would notice.
//
// WIRE bytes are what the throttle counts, so that is what is measured:
//   - compressible types, brotli at quality 3 — what Cloudflare's on-the-fly compression
//     actually emits. Calibrated against production: dist/index.html is 17131 bytes at q3
//     locally against 17244 bytes served from argon.gl, 0.7% apart. Do not "improve" this
//     to q11; it under-reports by ~20% and would let real regressions through.
//   - everything else raw, since Cloudflare does not compress it.
//
// Size alone is the wrong test, though: og/*.png are 100KB each and perfectly fine, because
// only social-media crawlers fetch them and those do not run on Russian networks. So files
// are classified by who actually loads them, walking src=/href= out of every page and then
// /_astro/ references out of the JS those pages pull in:
//
//   critical      reachable from a public page        over budget -> build fails
//   internal      reachable only from INTERNAL_PAGES  over budget -> warning
//   unreferenced  nothing links to it                 over the cut-off -> warning
//
// Reachability is regex-based and therefore approximate: a URL assembled at runtime from
// string fragments will not be seen, which is why unreferenced files are reported rather
// than passed over in silence. If a real asset shows up as unreferenced, that is the bug.
//
// Run: bun scripts/check-size-budget.ts [distDir]

import { brotliCompressSync, constants } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { dirname, normalize as normalizeUrl } from "node:path/posix";

const DIST = process.argv[2] ?? "dist";

/** Measured cut-off. Not a budget — the point past which a response never arrives. */
const CLIFF = 19_139;
/** Build fails here, leaving room for TLS/H2 framing and for operators stricter than the one measured. */
const HARD = 18_000;
/** Build warns here, so a shrinking margin is visible before it is spent. */
const WARN = 16_500;

const CF_BROTLI_QUALITY = 3;

/** Types Cloudflare compresses on the way out. Everything else travels raw. */
const COMPRESSIBLE = new Set([
  ".html", ".js", ".mjs", ".css", ".svg", ".json", ".txt", ".xml", ".webmanifest", ".map",
]);

// Unlisted tool pages, kept out of the sitemap and off every nav. They pull Vue and the full
// client mock — far over the cut-off — and are not worth trimming, but they do not block a
// deploy either. Anything reachable ONLY from here is a warning, not a failure.
const INTERNAL_PAGES = new Set(["mock/index.html", "icon-generator/index.html"]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const toUrl = (path: string) => relative(DIST, path).split(sep).join("/");

function wireSize(url: string, body: Buffer): number {
  const ext = url.slice(url.lastIndexOf("."));
  if (!COMPRESSIBLE.has(ext)) return body.length;
  return brotliCompressSync(body, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: CF_BROTLI_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
    },
  }).length;
}

/**
 * Local assets a file pulls in. Pages are read through src=/href= only, which is what
 * deliberately skips <meta property="og:image" content="…"> — a crawler fetch, not a page load.
 *
 * JS needs both forms: Vite writes sibling chunks as relative specifiers (`from"./runtime-dom
 * .esm-bundler.CgHYpHZ8.js"`) and only some paths as absolute, so matching /_astro/ alone
 * silently loses the whole chunk graph behind every dynamic import.
 */
function refsIn(url: string, body: Buffer): string[] {
  const text = body.toString("utf8");
  const here = dirname(url);
  const out = new Set<string>();
  const add = (ref: string) =>
    out.add(ref.startsWith("/") ? ref.slice(1) : normalizeUrl(join(here, ref).split(sep).join("/")));

  if (url.endsWith(".html")) {
    for (const m of text.matchAll(/(?:src|href)="((?:\/|\.{1,2}\/)[^"]+)"/g)) add(m[1]);
  } else if (url.endsWith(".js") || url.endsWith(".mjs")) {
    for (const m of text.matchAll(/["'`]((?:\/_astro\/|\.{1,2}\/)[A-Za-z0-9_.\-\/]+\.[a-z0-9]+)["'`]/g)) add(m[1]);
  }
  return [...out];
}

try {
  statSync(DIST);
} catch {
  console.error(`check-size-budget: no such directory: ${DIST} — run the build first.`);
  process.exit(1);
}

const files = new Map<string, Buffer>();
for (const p of walk(DIST)) files.set(toUrl(p), readFileSync(p));

/** Everything reachable from `roots`, following JS chunk imports transitively. */
function reachableFrom(roots: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const body = files.get(url);
    if (body) for (const r of refsIn(url, body)) if (!seen.has(r)) queue.push(r);
  }
  return seen;
}

const pages = [...files.keys()].filter((u) => u.endsWith(".html"));
const publicPages = pages.filter((u) => !INTERNAL_PAGES.has(u));
const criticalSet = reachableFrom(publicPages);
const internalSet = reachableFrom(pages.filter((u) => INTERNAL_PAGES.has(u)));

type Class = "critical" | "internal" | "unreferenced";
type Row = { url: string; wire: number; cls: Class };

const rows: Row[] = [...files].map(([url, body]) => ({
  url,
  wire: wireSize(url, body),
  cls: criticalSet.has(url) ? "critical" : internalSet.has(url) ? "internal" : "unreferenced",
}));
rows.sort((a, b) => b.wire - a.wire);

const failures = rows.filter((r) => r.cls === "critical" && r.wire > HARD);
const warnings = rows.filter(
  (r) => (r.cls === "critical" && r.wire > WARN && r.wire <= HARD) ||
         (r.cls !== "critical" && r.wire > CLIFF),
);

const counts = rows.reduce<Record<string, number>>((a, r) => ((a[r.cls] = (a[r.cls] ?? 0) + 1), a), {});
console.log(
  `Wire size against the ${CLIFF}-byte cut-off (brotli q${CF_BROTLI_QUALITY}) — ` +
  `${counts.critical ?? 0} critical, ${counts.internal ?? 0} internal, ${counts.unreferenced ?? 0} unreferenced\n`,
);
for (const r of rows.filter((x) => x.cls === "critical").slice(0, 10)) {
  const pct = Math.round((r.wire / CLIFF) * 100);
  const flag = r.wire > HARD ? "FAIL" : r.wire > WARN ? "warn" : "    ";
  console.log(`  ${flag} ${String(r.wire).padStart(7)}B  ${String(pct).padStart(4)}% of cut-off  ${r.url}`);
}

for (const r of warnings) {
  const note = r.cls === "critical"
    ? `${CLIFF - r.wire}B left before Russian transit stalls it`
    : `${r.cls}, over the ${CLIFF}B cut-off — unreachable from Russia, confirm nothing on a public page loads it`;
  console.log(`::warning file=${r.url}::${r.wire}B on the wire — ${note}.`);
}
for (const r of failures) {
  const how = COMPRESSIBLE.has(r.url.slice(r.url.lastIndexOf(".")))
    ? "Trim it, or split it."
    : "Serve it from PUBLIC_MEDIA_ORIGIN instead.";
  console.log(`::error file=${r.url}::${r.wire}B on the wire, over the ${HARD}B budget (cut-off ${CLIFF}B). ${how}`);
}

if (failures.length) {
  console.error(`\ncheck-size-budget: ${failures.length} file(s) on the critical path are over budget.`);
  process.exit(1);
}
console.log(`\ncheck-size-budget: ok${warnings.length ? ` (${warnings.length} warning(s))` : ""}.`);
