#!/usr/bin/env node
// cache-bust-images.mjs: content-hash cache-buster for LOCAL images in the built _site.
//
// The critical-css postprocess step (inline-critical-css.mjs) already content-hashes
// styles.css and script.js ?v= so they bust automatically on content change. IMAGES were
// never covered: a refreshed image keeps its path, so with Publication-Images cache-control
// max-age=14400 (4h) a returning visitor kept the stale cached copy until expiry (the
// 2026-06-30 Exhibit 1/2/3 stale-render incident). This step closes that gap: it rewrites
// ?v= on every LOCAL image reference to an 8-char sha256 of the shipped file, so the version
// changes if and only if the image content changes, with no manual ?v= bumps to forget.
//
// Fail-soft by construction: a missing/unreadable file leaves that ref unchanged, and
// nothing here can break image loading (the path is untouched; ?v= is a query string the
// static host ignores for file resolution). Single-URL src/href/srcset only; multi-URL
// srcsets (with descriptors/whitespace) are left untouched.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const SITE = process.argv[2] || '_site';
const IMG_EXT = 'png|jpg|jpeg|webp|gif|svg|ico|avif';
// attr="<root-relative local image>" with an optional existing ?v=, extension immediately
// before the closing quote so multi-URL srcsets (which carry spaces/commas) never match.
const REF_RE = new RegExp(`\\b(src|href|srcset)="(/[^"\\s]+?\\.(?:${IMG_EXT}))(?:\\?v=[^"]*)?"`, 'gi');

const hashCache = new Map();
async function version(rel) {
  if (hashCache.has(rel)) return hashCache.get(rel);
  let v = null;
  try {
    v = createHash('sha256').update(await fs.readFile(path.join(SITE, rel))).digest('hex').slice(0, 8);
  } catch {
    v = null; // absent/unreadable -> leave the ref as-is
  }
  hashCache.set(rel, v);
  return v;
}

async function* htmlFiles(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

let pages = 0, busted = 0;
for await (const file of htmlFiles(SITE)) {
  const html = await fs.readFile(file, 'utf8');
  const matches = [...html.matchAll(REF_RE)];
  if (!matches.length) continue;
  let out = '', last = 0, changed = false;
  for (const m of matches) {
    const [full, attr, urlPath] = m;
    const v = await version(urlPath.replace(/^\//, ''));
    if (!v) continue;
    out += html.slice(last, m.index) + `${attr}="${urlPath}?v=${v}"`;
    last = m.index + full.length;
    changed = true; busted++;
  }
  if (changed) { out += html.slice(last); await fs.writeFile(file, out); pages++; }
}
console.log(`[cache-bust-images] content-hashed ${busted} local image ref(s) across ${pages} page(s) in ${SITE}/`);
