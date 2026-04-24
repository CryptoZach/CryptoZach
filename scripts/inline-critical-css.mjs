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

import Critters from 'critters';
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

async function main() {
  const { buildPath } = parseArgs();

  try {
    await fs.access(buildPath);
  } catch {
    console.error(`ERROR: build path does not exist: ${buildPath}`);
    console.error('Run `jekyll build` first to produce _site/.');
    return 1;
  }

  const critters = new Critters({
    path: buildPath,
    // Preload strategy: swap (preload + onload swap to stylesheet).
    preload: 'swap',
    // Inline only CSS used above-the-fold; do not inline fonts (they are
    // loaded lazily via the preload swap).
    inlineFonts: false,
    // Do not prune the linked stylesheet after inlining; the deferred
    // fetch loads the full stylesheet for below-the-fold rules.
    pruneSource: false,
    // Minimize the inlined critical CSS.
    compress: true,
    // Log level: only warnings and errors.
    logLevel: 'warn',
  });

  const htmlFiles = await findHtmlFiles(buildPath);
  console.log(`Processing ${htmlFiles.length} HTML files for critical-CSS inlining...`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of htmlFiles) {
    try {
      const html = await fs.readFile(file, 'utf-8');
      const processed = await critters.process(html);
      await fs.writeFile(file, processed, 'utf-8');
      successCount++;
    } catch (err) {
      console.error(`ERROR processing ${path.relative(buildPath, file)}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`Processed: ${successCount} succeeded, ${errorCount} failed.`);
  return errorCount > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(2);
});
