# Offsite SEO action items

In-repo SEO work has saturated (18+ commits of structured data, image
optimization, schema completeness, and per-query targeting). Continued
ranking lift comes from offsite signals that cannot be implemented from
this clone. This document lists the offsite levers in priority order.

## 1. Bing Webmaster Tools setup

Bing accounts for roughly 10% of US search and is the upstream search
index used by ChatGPT web search, DuckDuckGo, Perplexity, and Yahoo.
Submitting to Bing is the single highest-leverage no-cost offsite action.

### Steps

1. Sign in at https://www.bing.com/webmasters with the Microsoft account
   that controls the site (or create one).
2. Click **Add a site**. Enter `https://tokenization.systems`.
3. Choose verification method:
   - **Recommended: Import from Google Search Console.** Bing will pull
     the site directly using your existing Google verification. This is
     the fastest path if Search Console is already configured.
   - Alternative: meta tag verification. Add the provided `<meta
     name="msvalidate.01" content="..." />` tag to the homepage `<head>`.
     I can wire this in once you provide the verification string.
4. Once verified, navigate to **Sitemaps** > **Submit sitemap**. Enter
   `https://tokenization.systems/sitemap.xml`.
5. Optional: Submit individual priority URLs via **URL Submission** for
   immediate crawl:
   - `https://tokenization.systems/`
   - `https://tokenization.systems/papers/mvep/`
   - `https://tokenization.systems/papers/routing-the-dollar/`
   - `https://tokenization.systems/speaker-and-advisory/`
   - `https://tokenization.systems/letters/`

### Verification

After 24-72 hours, Bing Webmaster Tools shows crawl statistics, indexed
page count, and keyword performance. Bing tends to index faster than
Google for new sites.

### Expected impact

ChatGPT, Perplexity, DuckDuckGo, and Yahoo source results from Bing's
index. Bing visibility for tokenization queries directly affects
AI-search citation rates from these tools, which is a meaningful
high-value-visitor channel for institutional research consumers.

## 2. Google Search Console action items

Assumes GSC is already verified for `tokenization.systems`. If not, the
verification flow is similar to Bing's (DNS TXT record, HTML file upload,
or Google tag).

### Steps

1. **Sitemaps tab**: Verify `sitemap.xml` is submitted. If missing,
   submit it. Look for "Success" status and check the indexed-pages
   count against the 35 URLs in the sitemap.

2. **Validate Fix** on prior rich-result errors:
   - Navigate to **Coverage** or **Enhancements** > Rich Results.
   - Find any items flagged as invalid (we previously fixed the
     `mainEntity` invalid-object-type errors on the 6 resume sub-pages
     in commit `e2ee4ce4`).
   - Click **Validate Fix** so Google re-checks the URLs and clears the
     warning.

3. **URL Inspection > Request Indexing** for priority pages:
   - Use the URL Inspector tool on each priority URL.
   - For each, click **Request Indexing**. This pushes the URL up the
     crawl queue (typically gets crawled within a few hours, indexed
     within 1-3 days).
   - Priority URLs (highest expected ranking impact):
     - `https://tokenization.systems/` (brand entity)
     - `https://tokenization.systems/overview/` ("What is Tokenization")
     - `https://tokenization.systems/frameworks/` (DefinedTermSet)
     - `https://tokenization.systems/papers/mvep/` (HowTo + FAQ + topic)
     - `https://tokenization.systems/papers/routing-the-dollar/` (FAQ +
       Dataset + topic)
     - `https://tokenization.systems/papers/three-strategies/`
       ("Tokenization Strategy")
     - `https://tokenization.systems/speaker-and-advisory/`
       ("Tokenization Advisory")

4. **Performance > Search Results**: Weekly monitoring of the five
   target queries:
   - "tokenization systems" / "tokenization system"
   - "tokenization advisory" / "tokenization advisor"
   - "tokenization strategy"
   - "what is tokenization"
   - "MVEP framework"
   - "CLII Control Layer Intensity Index"
   Track impressions, average position, and click-through rate per
   query. Compare week-over-week.

## 3. Backlink and citation strategy

The most underleveraged authority signal. The site has 8 federal comment
letters filed across OCC, FDIC, Treasury, FinCEN, and joint banking
agency dockets. When those rulemakings publish their final rules, the
rule preamble standard-cites substantive comments by author and docket
comment number. This creates a regulations.gov entry that, in turn,
attracts citations from trade press (American Banker, Bloomberg Banking,
Banking Dive, CoinDesk, The Block, Pensions & Investments) and from
follow-on academic papers that reference the comment letters.

### Steps to maximize backlink yield

1. **Watch for final rule publications** in the Federal Register on the
   six dockets we filed against. Set up Federal Register email alerts
   for each docket number:
   - OCC-2025-0372 (PPSI rule)
   - TREAS-DO-2026-0232 (Treasury state-similarity)
   - FINCEN-2026-0034 (FinCEN AML/CFT)
   - FINCEN-2026-0100 (FinCEN/OFAC sanctions)
   - RIN 3064-AG19 and RIN 3064-AG20 (FDIC AG19, AG20)
   - 91 FR 18304 (joint banking agency AML)

2. **When a final rule publishes**, search the published Federal
   Register notice for "Zukowski" or "Tokenization Systems" mentions.
   Substantive comments are typically cited by name in the preamble's
   "Summary of Comments and Agency Response" section. Each citation is
   a high-authority backlink to the regulations.gov comment URL, which
   indirectly cites tokenization.systems via the comment body.

3. **Trade press outreach**: When a final rule publishes that cites your
   comment, reach out to journalists covering that beat with a one-line
   email: "Final rule cites my MVEP framework recommendations at [page
   X]. Background paper is at tokenization.systems/papers/mvep/.
   Available for comment if useful." This is how high-authority backlinks
   from American Banker, Banking Dive, etc. get created.

4. **SSRN cross-citation**: When other researchers publish papers on
   stablecoin regulation, tokenized deposits, or DePIN tokenomics on
   SSRN, they search SSRN for prior work. The eight tokenization.systems
   papers on SSRN should appear in those searches. To maximize this:
   - Keep SSRN abstract pages updated with relevant keywords (the
     tokenization.systems papers already have strong abstracts).
   - Cross-cite your own papers within new papers (already done in the
     research program).
   - Engage with replying authors on their SSRN pages or on Twitter/X
     when their papers cite related concepts.

5. **Podcast and conference appearances**: For institutional audiences,
   appearance on podcasts like Bits + Bips, Empire (Blockworks), The
   Defiant, Crypto Insider, or speaking slots at conferences like
   Permissionless, Token2049, Mainnet, Real World Assets Summit creates
   audio transcript indexing AND brand-mention authority. Each podcast
   appearance is typically a 1-3 backlink lift. The Tokenization Systems
   research arc is exactly the kind of content these audiences want.

6. **LinkedIn long-form posts**: Each LinkedIn article published with a
   link to a paper page becomes a backlink. LinkedIn URLs themselves
   carry authority. Posting a 600-1000 word LinkedIn article tied to a
   research paper or comment letter typically yields 1 indirect
   citation lift per post.

## 4. Cloudflare side actions

See `CLOUDFLARE_ACTIONS.md` for cache TTL extension. (We confirmed in
this cycle that keeping Managed Robots ON does not significantly hurt
real SEO; only the cosmetic Lighthouse score.)

## 5. Calendar of compounding activity

For sustained ranking lift, set a recurring schedule:

- **Weekly**: 1 LinkedIn post linking to a paper or letter, plus 2-3
  Twitter/X posts threading the research.
- **Monthly**: 1 new research insight (200-500 words) published to the
  site, with cross-posts to LinkedIn and Substack/Buttondown newsletter.
- **Quarterly**: 1 podcast appearance, conference talk, or video
  produced.
- **Annually**: 1 major paper or framework launch with coordinated trade
  press outreach.

Each compounds with the others. Google's freshness, authority, and
engagement signals all reward consistent publication cadence.

## What's NOT in scope here

- Paid SEO (link buying, sponsored placements). Quality decreases over
  time and risks penalties.
- Aggressive guest posting on low-quality sites. Authority comes from
  high-authority publishers, not volume.
- AI-generated content for ranking. Google's spam policies penalize
  scaled AI-only content; the research program publishes original work,
  which is exactly what Google rewards.
