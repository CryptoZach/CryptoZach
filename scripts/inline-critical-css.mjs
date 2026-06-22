#!/usr/bin/env node
/**
 * Inline critical CSS across _site/ HTML files using Critters.
 *
 * Runs after PurgeCSS + CSS minification in the post-Jekyll-build
 * pipeline. For each .html in _site/, extracts the above-the-fold CSS
 * rules needed for first paint, inlines them in <head>, and defers the
 * rest of styles.css via rel="preload" + onload="this.rel='stylesheet'"
 * (with a noscript fallback).
 *
 * This is the real Lighthouse LCP fix surfaced by the 2026-04-23
 * baseline audit (render-blocking styles.css wasted ~450ms on first
 * paint across all pages; LCP on text-bound pages like home and
 * overview moves from ~4.8s to ~1.5-2s expected after critical-CSS
 * inlining).
 *
 * Critters (https://github.com/GoogleChromeLabs/critters) is the
 * underlying tool. It's actively maintained by Google Chrome Labs and
 * is the de-facto standard for static-site critical-CSS inlining.
 *
 * Usage:
 *   node scripts/inline-critical-css.mjs             # processes _site/
 *   node scripts/inline-critical-css.mjs --path OUT  # processes OUT/
 *
 * Exit codes:
 *   0: success
 *   1: _site/ or specified path does not exist
 *   2: Critters processing error on one or more files
 */

import Beasties from 'beasties';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  let buildPath = path.join(REPO_ROOT, '_site');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      buildPath = path.resolve(args[i + 1]);
      i++;
    }
  }
  return { buildPath };
}

async function findHtmlFiles(rootDir) {
  const results = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        results.push(full);
      }
    }
  }
  await walk(rootDir);
  return results;
}

// Regex to strip and capture the ?v=N query string from stylesheet href
// attributes. Critters resolves href values as filesystem paths; when the
// href includes a query string (e.g., ?v=128 per our cache-buster
// convention), the literal path does not exist on disk and Critters
// silently skips inlining for that sheet. We strip ?v=N before Critters
// runs, then restore it in both the <link rel="stylesheet"> original
// reference AND the <link rel="preload"> Critters may add via preload
// swap. Cache-buster discipline preserved end-to-end; Critters gets the
// clean path it needs.
const CACHE_BUSTER_RE = /(href="[^"]*\.css)\?v=(\d+)(")/g;

function stripCacheBusters(html) {
  const captured = [];
  const stripped = html.replace(CACHE_BUSTER_RE, (_match, prefix, version, suffix) => {
    captured.push(version);
    return `${prefix}${suffix}`;
  });
  return { stripped, versions: captured };
}

function restoreCacheBusters(html, versions, preferredVersion) {
  // Prefer the content-hash version derived from the final styles.css
  // (preferredVersion); fall back to the integer captured from source only if
  // the stylesheet could not be hashed. After Beasties there may be MORE <link>
  // references to the same stylesheet (e.g., preload + original kept as
  // fallback); we apply one version to all .css href attributes (the site has a
  // single stylesheet, styles.css).
  const version = preferredVersion || versions[0];
  if (!version) return html;
  return html.replace(/(href="[^"]*\.css)(")/g, `$1?v=${version}$2`);
}

// Content-hash cache-buster: derive ?v= from the final (post-PurgeCSS, post-
// minify) styles.css so the version changes if and only if the shipped CSS
// content changes. This eliminates manual ?v= integer bumps in source HTML and
// the drift/leak they cause (stale CSS served when a bump is forgotten; a stray
// bump leaked when an unrelated change is propagated). Source HTML may keep an
// integer ?v= for local-dev convenience; this build step overrides it on the
// _site output. Returns null if the stylesheet is absent (callers then keep the
// source's captured integer, preserving prior behavior).
async function computeCssVersion(buildPath) {
  try {
    const css = await fs.readFile(path.join(buildPath, 'styles.css'));
    return createHash('sha256').update(css).digest('hex').slice(0, 8);
  } catch {
    return null;
  }
}

// Beasties 0.4.2 with preload: 'swap' (and most other preload modes)
// emits THREE stylesheet references per file:
//   1. <link rel="preload" ... onload="this.rel='stylesheet'" as="style">
//      (async preload that swaps to stylesheet on load; non-blocking)
//   2. <link rel="stylesheet" ...>
//      (render-blocking duplicate; defeats the preload swap)
//   3. <noscript><link rel="stylesheet" ...></noscript>
//      (fallback for JS-disabled browsers; correct)
//
// The render-blocking duplicate (item 2) undoes the entire point of
// critical-CSS inlining. This function removes it while preserving the
// preload (1) and the noscript fallback (3). Result: zero render-
// blocking stylesheet links for JS-enabled browsers; noscript
// fallback preserves CSS for JS-disabled browsers.
//
// Detection rule: a <link rel="stylesheet" href="...css...">  that is
// NOT inside a <noscript> block AND is preceded somewhere upstream by a
// matching <link rel="preload" ... as="style"> for the same stylesheet
// href is the duplicate to remove.
function removeRedundantStylesheetLink(html) {
  // Find all <link rel="preload" ... as="style" ...> hrefs.
  const preloadRe = /<link\s+[^>]*rel="preload"[^>]*as="style"[^>]*>/g;
  const preloadHrefs = new Set();
  for (const m of html.matchAll(preloadRe)) {
    const hrefMatch = m[0].match(/href="([^"]+)"/);
    if (hrefMatch) preloadHrefs.add(hrefMatch[1]);
  }
  if (preloadHrefs.size === 0) return html;

  // Remove each <link rel="stylesheet" href="X"> where X is in
  // preloadHrefs AND the link is not inside a <noscript> block.
  // Strategy: walk the HTML, tracking whether we're inside noscript.
  // For each <link rel="stylesheet">, check href; if matches a preload
  // href and we are not inside noscript, remove the tag.
  let result = '';
  let i = 0;
  let insideNoscript = false;
  while (i < html.length) {
    if (!insideNoscript && html.startsWith('<noscript', i)) {
      const close = html.indexOf('>', i);
      if (close > -1) {
        insideNoscript = true;
        result += html.substring(i, close + 1);
        i = close + 1;
        continue;
      }
    }
    if (insideNoscript && html.startsWith('</noscript>', i)) {
      insideNoscript = false;
      result += '</noscript>';
      i += '</noscript>'.length;
      continue;
    }
    if (!insideNoscript && html.startsWith('<link', i)) {
      const close = html.indexOf('>', i);
      if (close > -1) {
        const tag = html.substring(i, close + 1);
        // Is this a rel="stylesheet" link matching a preload href?
        const relMatch = tag.match(/rel="stylesheet"/);
        const hrefMatch = tag.match(/href="([^"]+)"/);
        if (relMatch && hrefMatch && preloadHrefs.has(hrefMatch[1])) {
          // Skip this tag. Also skip any trailing whitespace before next
          // element, but only up to one whitespace run, to preserve
          // formatting.
          i = close + 1;
          while (i < html.length && (html[i] === ' ' || html[i] === '\n' || html[i] === '\t')) {
            i++;
          }
          continue;
        }
        result += tag;
        i = close + 1;
        continue;
      }
    }
    result += html[i];
    i++;
  }
  return result;
}

async function main() {
  const { buildPath } = parseArgs();

  try {
    await fs.access(buildPath);
  } catch {
    console.error(`ERROR: build path does not exist: ${buildPath}`);
    console.error('Run `jekyll build` first to produce _site/.');
    return 1;
  }

  // Beasties is the maintained successor to Critters (Nuxt team fork;
  // see https://github.com/danielroe/beasties). Drop-in API-compatible
  // replacement. Selected over Critters 0.0.25 because Critters'
  // `preload: 'swap'` mode produced malformed output (two rel="stylesheet"
  // links, no rel="preload") instead of the expected preload+onload swap
  // pattern, preserving render-blocking behavior and defeating the
  // critical-CSS LCP fix. Beasties emits the correct preload+noscript
  // fallback pattern.
  const beasties = new Beasties({
    path: buildPath,
    // Preload strategy: swap (preload + onload swap to stylesheet +
    // noscript fallback).
    preload: 'swap',
    // Inline only CSS used above-the-fold; do not inline fonts (they are
    // loaded lazily via the preload swap).
    inlineFonts: false,
    // Do not prune the linked stylesheet after inlining; the deferred
    // fetch loads the full stylesheet for below-the-fold rules.
    pruneSource: false,
    // Minimize the inlined critical CSS.
    compress: true,
    // Log level: silent to suppress harmless "Empty sub-selector"
    // warnings from CSS containing (psuedo-selector with trailing
    // specificity-increase patterns).
    logLevel: 'silent',
  });

  const cssVersion = await computeCssVersion(buildPath);
  console.log(
    cssVersion
      ? `Cache-buster: content-hash ?v=${cssVersion} (sha256 of ${path.relative(REPO_ROOT, path.join(buildPath, 'styles.css'))})`
      : 'Cache-buster: styles.css not found at build path; preserving source ?v= integers'
  );

  const htmlFiles = await findHtmlFiles(buildPath);
  console.log(`Processing ${htmlFiles.length} HTML files for critical-CSS inlining...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalInlinedBytes = 0;

  for (const file of htmlFiles) {
    try {
      const html = await fs.readFile(file, 'utf-8');
      const { stripped, versions } = stripCacheBusters(html);
      const inputSize = stripped.length;
      const processed = await beasties.process(stripped);
      const deduped = removeRedundantStylesheetLink(processed);
      const restored = restoreCacheBusters(deduped, versions, cssVersion);
      const inlinedBytes = restored.length - inputSize;
      if (inlinedBytes > 0) totalInlinedBytes += inlinedBytes;
      await fs.writeFile(file, restored, 'utf-8');
      if (inlinedBytes > 100) {
        successCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      console.error(`ERROR processing ${path.relative(buildPath, file)}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(
    `Processed: ${successCount} inlined critical CSS, ${skippedCount} no-op (no stylesheet or already processed), ${errorCount} failed. ` +
    `Total critical CSS inlined: ~${Math.round(totalInlinedBytes / 1024)} KB.`
  );
  return errorCount > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(2);
});
