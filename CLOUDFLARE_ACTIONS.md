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

### Decision needed first

- **If the AI-crawler blocks ARE intended**: keep them but disable the
  `Content-Signal` directive only. Cloudflare may not offer this granularity;
  in that case, disable Managed Robots and replicate the desired blocks
  directly in this repo's `robots.txt`.
- **If the AI-crawler blocks are NOT intended** (you want AI crawlers to
  see the site for training, retrieval, etc.): disable Managed Robots
  entirely.

### Steps (Cloudflare dashboard)

1. Log in to Cloudflare, select the `tokenization.systems` zone.
2. Navigate to **Security** > **Bots** (or **Scrape Shield** depending on
   your Cloudflare plan).
3. Look for a setting called **AI Audit**, **AI Scrape Protection**, or
   **Managed Robots.txt**. The exact name varies by Cloudflare plan tier.
4. Disable it.

Alternative path: **Caching** > **Configuration** > look for **Crawler
Hints** or **AI Crawl Control**.

### If you want to keep some of the AI blocks

After disabling Managed Robots, append the desired AI-crawler blocks to
this repo's `robots.txt` (without the invalid `Content-Signal` directive):

```
# Block AI training crawlers
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /
```

(Add or omit per your preference.)

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
