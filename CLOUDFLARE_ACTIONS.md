# Cloudflare actions for tokenization.systems

PageSpeed Insights report (2026-05-18) surfaced two improvements that can
only be fixed in the Cloudflare dashboard, not in this repo. Both are
safe, reversible, and add up to ~403 KiB of cacheable bytes + recover the
SEO Lighthouse score from 92 back to 100.

Performance: 99/100 already. These changes target the remaining headroom.

## 1. Extend cache TTL on versioned static assets

**Lighthouse finding**: "Use efficient cache lifetimes, est savings 403 KiB."
All first-party assets (styles.css, script.js, image files, matrix icons)
are currently served with `cache-control: max-age=14400` (4 hours), which
is Cloudflare's default Edge Cache TTL for GitHub Pages origins.

The site already cache-busts via query parameters (e.g., `styles.css?v=225`,
`fidelity.png?v=139`), so a long cache lifetime is safe: any change bumps
the version parameter and forces re-fetch. Without an extended TTL, repeat
visitors re-validate every 4 hours.

### Steps (Cloudflare dashboard)

1. Log in to Cloudflare, select the `tokenization.systems` zone.
2. Navigate to **Caching** > **Cache Rules**.
3. Click **Create rule**.
4. Configure:
   - **Rule name**: `Long cache for versioned static assets`
   - **When incoming requests match**:
     - Field: `URI Query String`
     - Operator: `contains`
     - Value: `v=`
   - **Then**:
     - Cache eligibility: `Eligible for cache`
     - Edge TTL: `Override origin`, value: `1 year (31536000 seconds)`
     - Browser TTL: `Override origin`, value: `1 year`
5. **Deploy**.

### Verification

After ~5 minutes (CDN propagation), run:

```bash
curl -sI 'https://tokenization.systems/styles.css?v=225' | grep -iE 'cache-control|cf-cache'
```

Expected: `cache-control: max-age=31536000` (or similar long value) and
`cf-cache-status: HIT` on second request.

### Reversibility

Delete the cache rule in the Cloudflare dashboard. Cache will return to
the 4-hour default within minutes.

## 2. Disable Managed Robots (Content-Signal injection)

**Lighthouse finding**: "robots.txt is not valid, 1 error found. Line 29:
`Content-Signal: search=yes,ai-train=no` Unknown directive."

The repo's `robots.txt` is a clean 4-line file (User-agent, Allow, Sitemap).
Cloudflare's **Managed Robots** feature is injecting an additional ~50
lines, including the `Content-Signal` directive (a new Cloudflare proposal
not yet recognized by the robots.txt spec). Lighthouse flags this as
invalid, dropping the SEO score from 100 to 92.

The injected content also includes AI-crawler `Disallow` rules
(GPTBot, ClaudeBot, Google-Extended, Bytespider, etc.), which may or may
not be intended.

### Decision already made

The repo's `robots.txt` now includes explicit Disallow rules for 29
AI-training and scraping crawlers (GPTBot, ClaudeBot, Google-Extended,
CCBot, Bytespider, Meta-ExternalAgent, PerplexityBot, etc.). Disabling
Cloudflare Managed Robots is therefore safe: the protective blocks
survive because they ship from this repo. The only thing that disappears
is the invalid `Content-Signal` directive that Lighthouse flags.

### Steps (Cloudflare dashboard)

1. Log in to Cloudflare, select the `tokenization.systems` zone.
2. Navigate to **Security** > **Bots** (or **Scrape Shield** depending on
   your Cloudflare plan).
3. Look for a setting called **AI Audit**, **AI Scrape Protection**, or
   **Managed Robots.txt**. The exact name varies by Cloudflare plan tier.
4. Disable it.

Alternative path: **Caching** > **Configuration** > look for **Crawler
Hints** or **AI Crawl Control**.

### Verification

```bash
curl -s https://tokenization.systems/robots.txt
```

Expected: only your repo's content, no Cloudflare-injected lines, no
`Content-Signal` directive.

Then re-run PageSpeed Insights. SEO score should recover to 100.

### Reversibility

Re-enable Managed Robots in the Cloudflare dashboard.

## Out of scope (already handled or not worth pursuing)

- **Largest Contentful Paint render delay (930 ms)**: caused by main-thread
  work during initial paint, not by render-blocking CSS (critical-CSS is
  already inlined correctly). Would require a deeper JS audit to address
  meaningfully.
- **Unused CSS (54 KiB)**: PurgeCSS config exists in this repo
  (`purgecss.config.cjs`) but CI currently runs `build:postprocess` (no
  purge). Enabling `build:postprocess:with-purgecss` requires verification
  that the safelist covers all dynamically-applied classes; risk of
  overstripping. Defer until separately validated.
- **GTM unused JS (66 KiB)**: gtag loads async, so does not block render.
  Deferring further would trade analytics fidelity for a small TBT win.

## 3. Turn off Email Address Obfuscation (added 2026-10-12)

**Audit finding (2026-10-12)**: 43 served pages carry
`href="/cdn-cgi/l/email-protection#..."` in place of their `mailto:` links.
That is Cloudflare's Scrape Shield rewriting the address at the edge. With
JavaScript the decode script restores the link; without it (crawlers, link
checkers, RSS readers, Lighthouse's link audit, readers with scripts off)
the href is a 404. The decode script is also the one blocking third-party
request on the homepage (87 ms of main-thread time in the audit run).

The repo already writes the address in title case everywhere
(`Zach@Tokenization.Systems`, enforced by `scripts/check_domain_casing.py`),
and the contact page carries a copy-to-clipboard control, so obfuscation adds
nothing the site relies on.

### Steps (Cloudflare dashboard)

1. Select the `tokenization.systems` zone.
2. Navigate to **Scrape Shield**.
3. Set **Email Address Obfuscation** to **Off**.

### Verification

```bash
curl -s 'https://tokenization.systems/contact/' | grep -c 'cdn-cgi/l/email-protection'   # expect 0
curl -s 'https://tokenization.systems/contact/' | grep -o 'mailto:[^"]*' | head -3
```

## 4. Bulk Redirects for the legacy `.html` URLs (added 2026-10-12)

GitHub Pages cannot answer a 301, so the legacy URLs (`/frameworks.html`,
`/contact.html`, `/resume.html`, `/speaker.html`, `/start-here.html`,
`/papers/routing-the-dollar.html` and the rest listed in `_redirects`) answer
200 with a meta-refresh stub that carries `noindex` and a canonical link.
That is correct as far as the origin can go; Cloudflare can finish the job.

### Steps (Cloudflare dashboard)

1. **Bulk Redirects** > **Create Bulk Redirect List**: name it
   `legacy-html-paths`, then add each `source -> target` pair from
   `_redirects` (status 301, preserve query string on, subpath matching off).
2. **Create Bulk Redirect Rule** that uses the list, then **Enable**.

### Verification

```bash
curl -sI 'https://tokenization.systems/frameworks.html' | grep -iE '^(HTTP|location)'   # expect 301 and /frameworks/
```

## 5. Status of section 1 (cache TTL), checked 2026-10-12

Live assets still answer `cache-control: max-age=600` (the GitHub Pages
origin value), so the cache rule in section 1 has not been deployed yet.
Every stylesheet, script, font and image URL is content-hashed at build
time (`?v=<sha256[:8]>`), so the one-year browser TTL in section 1 remains
safe. Lighthouse flags 97 short-lived resources on the homepage and 5 to 7
on every inner page until the rule is in place.
