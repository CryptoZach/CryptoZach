#!/usr/bin/env node
/**
 * Build-time program-identifier wrapper.
 *
 * Mirrors the runtime auto-wrap at script.js:5699 but applies it to
 * _site/*.html files at build time, eliminating the post-FCP DOM
 * mutation that delays LCP.
 *
 * Behavior contract (must match script.js runtime):
 *   - TERMS: CLII, MVEP, PPSI, FQPSI, NPRM, GENIUS, CLARITY
 *     (case-sensitive; word-boundary matched)
 *   - TERM_LINKS: GENIUS and CLARITY get <a class="term term-link"
 *     href="..." target="_blank" rel="noopener noreferrer">; others get
 *     <span class="term">
 *   - SCAN_SELECTORS: main p, main li, main td, main blockquote,
 *     main figcaption, main dt, main dd
 *   - Skip tags (anywhere in ancestor chain): A, CODE, PRE, KBD, SAMP,
 *     VAR, SCRIPT, STYLE, BUTTON, NAV, H1-H6
 *   - Skip class (anywhere in ancestor chain): "term" (prevents
 *     double-wrap)
 *   - Idempotent: safe to re-run on already-wrapped HTML (the .term
 *     skip-class makes it a no-op for already-wrapped terms)
 *
 * Usage:
 *   node scripts/wrap-terms-build.mjs               # processes _site/
 *   node scripts/wrap-terms-build.mjs --path OUT    # processes OUT/
 *   node scripts/wrap-terms-build.mjs --dry-run     # preview only
 *
 * Pipeline position: runs in build:postprocess BEFORE critical-CSS
 * inlining, so Beasties sees the wrapped spans when extracting
 * above-fold rules.
 *
 * Exit codes:
 *   0: success
 *   1: build path does not exist
 *   2: processing error on one or more files
 */

import { load } from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Longer docket forms before their short variants so the regex matches
// the full form preferentially (e.g., "RIN 3064-AG19" before "AG19").
const TERMS = [
  'RIN 3064-AG19', 'RIN 3064-AG20',
  'OCC-2025-0372', 'FINCEN-2026-0034', 'FINCEN-2026-0100',
  'TREAS-DO-2026-0232', '91 FR 18304',
  'AG19', 'AG20',
  'CLII', 'MVEP', 'PPSI', 'FQPSI', 'NPRM', 'GENIUS', 'CLARITY',
];
const TERM_LINKS = {
  'CLII':               '/papers/routing-the-dollar/',
  'MVEP':               '/papers/mvep/',
  'AG19':               '/letters/fdic-ag19-ppsi-activities/',
  'AG20':               '/letters/fdic-ag20-ppsi-application/',
  'RIN 3064-AG19':      '/letters/fdic-ag19-ppsi-activities/',
  'RIN 3064-AG20':      '/letters/fdic-ag20-ppsi-application/',
  'FINCEN-2026-0034':   '/letters/fincen-aml-cft/',
  'FINCEN-2026-0100':   '/letters/fincen-ofac-ppsi-sanctions/',
  'OCC-2025-0372':      '/letters/occ-mvep-v4/',
  'TREAS-DO-2026-0232': '/letters/treasury-genius-state-similarity/',
  '91 FR 18304':        '/letters/banking-agencies-joint-aml/',
  'GENIUS':             'https://medium.com/@CryptoZach/navigating-the-new-era-of-digital-assets-how-recent-u-s-64a29c4b061f',
  'CLARITY':            'https://medium.com/@CryptoZach/navigating-the-new-era-of-digital-assets-how-recent-u-s-64a29c4b061f',
};
const PATTERN = new RegExp('\\b(' + TERMS.join('|') + ')\\b', 'g');
const SKIP_TAGS = new Set(['a', 'code', 'pre', 'kbd', 'samp', 'var', 'script', 'style', 'button', 'nav', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const SKIP_CLASS = 'term';
const SCAN_SELECTORS = 'main p, main li, main td, main blockquote, main figcaption, main dt, main dd';

function parseArgs() {
  const args = process.argv.slice(2);
  let buildPath = path.join(REPO_ROOT, '_site');
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) { buildPath = path.resolve(args[i + 1]); i++; }
    else if (args[i] === '--dry-run') { dryRun = true; }
  }
  return { buildPath, dryRun };
}

async function findHtmlFiles(rootDir) {
  const results = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.html')) results.push(full);
    }
  }
  await walk(rootDir);
  return results;
}

// Walk up from a node; return true if any ancestor is in SKIP_TAGS or
// has class "term". Mirrors the runtime shouldSkip logic, but in
// cheerio's API where `.parent()` walks up.
function shouldSkip(node, $) {
  let p = node.parent;
  while (p && p.type === 'tag') {
    if (SKIP_TAGS.has(p.name)) return true;
    const cls = p.attribs && p.attribs.class;
    if (cls && cls.split(/\s+/).includes(SKIP_CLASS)) return true;
    p = p.parent;
  }
  return false;
}

// Recursively collect text nodes within a root (cheerio element).
function collectTextNodes(root) {
  const out = [];
  function walk(node) {
    if (node.type === 'text') {
      out.push(node);
      return;
    }
    if (node.type === 'tag' && node.children) {
      for (const child of node.children) walk(child);
    }
  }
  if (root.children) for (const c of root.children) walk(c);
  return out;
}

// Build replacement HTML for a text-node string. Returns null if no
// matches; otherwise returns an HTML string with the wrapped spans/links.
function buildReplacementHtml(text) {
  PATTERN.lastIndex = 0;
  if (!PATTERN.test(text)) return null;
  PATTERN.lastIndex = 0;
  let out = '';
  let last = 0;
  let m;
  while ((m = PATTERN.exec(text)) !== null) {
    if (m.index > last) out += escapeHtml(text.slice(last, m.index));
    const matched = m[0];
    const url = TERM_LINKS[matched];
    if (url) {
      // External URLs open in a new tab; internal (same-site) navigate in place.
      const external = /^https?:\/\//i.test(url);
      const attrs = external ? ` target="_blank" rel="noopener noreferrer"` : '';
      out += `<a class="term term-link" href="${url}"${attrs}>${matched}</a>`;
    } else {
      out += `<span class="term">${matched}</span>`;
    }
    last = m.index + matched.length;
  }
  if (last < text.length) out += escapeHtml(text.slice(last));
  return out;
}

// HTML-escape only the characters that change meaning in HTML text
// content (& < >). Quotes are not escaped because we are in text-content
// position, not attribute position.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function processFile(filePath, dryRun) {
  const html = await fs.readFile(filePath, 'utf-8');
  // decodeEntities: false keeps existing entities as-is (no &amp; → &
  // round-trip surprises that would otherwise break diff verification).
  const $ = load(html, { decodeEntities: false });
  let wrappedCount = 0;
  $(SCAN_SELECTORS).each((_, el) => {
    const textNodes = collectTextNodes(el);
    for (const tn of textNodes) {
      if (shouldSkip(tn, $)) continue;
      const replacement = buildReplacementHtml(tn.data);
      if (replacement === null) continue;
      // Replace the text node in place. cheerio doesn't expose direct
      // text-node replacement cleanly; we use the parent + index pattern
      // by setting data to a sentinel and then leveraging $.html() round
      // trip — but a simpler/faster path: use $(tn).replaceWith(html).
      $(tn).replaceWith(replacement);
      wrappedCount++;
    }
  });
  if (wrappedCount === 0) return { changed: false, wrapped: 0 };
  // Mark the document so the runtime auto-wrap in script.js can no-op
  // and avoid the redundant TreeWalker pass that delays LCP.
  $('html').attr('data-terms-wrapped', 'true');
  if (!dryRun) {
    await fs.writeFile(filePath, $.html(), 'utf-8');
  }
  return { changed: true, wrapped: wrappedCount };
}

async function main() {
  const { buildPath, dryRun } = parseArgs();
  try { await fs.access(buildPath); }
  catch { console.error(`ERROR: build path does not exist: ${buildPath}`); return 1; }

  const files = await findHtmlFiles(buildPath);
  console.log(`Wrapping program-identifier terms in ${files.length} HTML files${dryRun ? ' (DRY RUN)' : ''}...`);
  let modified = 0;
  let totalWrapped = 0;
  let errors = 0;
  for (const file of files) {
    try {
      const { changed, wrapped } = await processFile(file, dryRun);
      if (changed) {
        modified++;
        totalWrapped += wrapped;
      }
    } catch (err) {
      console.error(`ERROR processing ${path.relative(buildPath, file)}: ${err.message}`);
      errors++;
    }
  }
  console.log(`Modified: ${modified} files (${totalWrapped} text-node replacements). Errors: ${errors}.`);
  return errors > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(2);
});
