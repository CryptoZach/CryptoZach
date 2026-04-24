// PurgeCSS configuration for tokenization.systems post-Jekyll build.
//
// Reads HTML and JS under _site/ to determine which CSS selectors are
// actually referenced, strips everything else from _site/styles.css.
//
// IMPORTANT: content[] must include ALL files that may reference CSS
// classes dynamically. We include JS files because script.js adds/removes
// classes programmatically (e.g., matrix-hover-activator transitions,
// scroll-triggered classes). PurgeCSS's default mode scans for literal
// class-name tokens across these files.
//
// safelist[] covers selectors that PurgeCSS cannot statically detect:
//   - Classes generated via string concatenation in JS.
//   - State classes applied by hover / focus / :target.
//   - Third-party embed classes (JSON-LD analytics; GTM containers).
//   - Print stylesheet classes (PurgeCSS scans the media query by default
//     but pattern-based safelist is safer for print).

module.exports = {
  content: ['_site/**/*.html', '_site/**/*.js'],
  css: ['_site/styles.css'],
  output: '_site/styles.css',
  defaultExtractor: (content) =>
    content.match(/[\w-/:]+(?<!:)/g) || [],
  safelist: {
    standard: [
      // Matrix-hover/scroll classes toggled in script.js at runtime.
      /^matrix-/,
      /^mtx-/,
      // Hover and focus state variants (PurgeCSS generally handles these
      // but an explicit safelist prevents false positives).
      /:hover$/,
      /:focus$/,
      /:active$/,
      /:focus-visible$/,
      /:focus-within$/,
      // Print / media query utility classes.
      /^print-/,
      /^sr-/,
      // Tailwind-like utility suffixes present in styles.css (if any).
      /--[\w-]+$/,
    ],
    deep: [
      // CTA button states and variants that may be applied via JS.
      /cta-[\w-]+/,
      // Writing-thumb variants.
      /thumb-[\w-]+/,
      // Hero grid and headline classes (some are applied via JS matrix
      // activation patterns).
      /hero-[\w-]+/,
    ],
    greedy: [
      // Catch-all for any class starting with "is-" or "has-" (common
      // state-toggle convention in JS-driven UI).
      /^is-/,
      /^has-/,
    ],
  },
  // Keep keyframe animations even if their animation names are referenced
  // only in generated styles (safer default for design-system refactor).
  keyframes: false,
  // Preserve font-face declarations (some fonts are referenced only by
  // @font-face + style rule; PurgeCSS can miss these).
  fontFace: false,
  // Preserve CSS custom properties (--accent, --accent-cta, type scale,
  // spacing rhythm variables). PurgeCSS v6+ supports variables: false
  // to skip variable pruning entirely; we want this for the design-system.
  variables: false,
};
