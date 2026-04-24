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

function restoreCacheBusters(html, versions) {
  if (versions.length === 0) return html;
  // After Critters, there may be MORE <link> references to the same
  // stylesheet (e.g., preload + original kept as fallback). We apply the
  // first captured version to all .css href attributes; the site only
  // has one stylesheet (styles.css) so a single version value is
  // sufficient.
  const version = versions[0];
  return html.replace(/(href="[^"]*\.css)(")/g, `$1?v=${version}$2`);
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
      const restored = restoreCacheBusters(processed, versions);
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
