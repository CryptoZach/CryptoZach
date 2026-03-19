---
name: cryptozach-new-page
description: "Checklist for adding a new top-level or key page to cryptozach.com so the page is reachable and consistent. Use when the user adds a new HTML page, a new section route, or a new resume/profile page. Trigger on 'new page', 'add a page', 'new route', 'new resume profile', or when creating a file like contact-new.html or a new resume/*.html. Ensures nav, footer, sitemap, and skills stay in sync."
---

# New page checklist

When adding a new page that should be part of site navigation or discovery, complete these steps so the page is not orphaned and is included in audits.

## 1. Page content and structure

- Place the file in the correct location (root for top-level, `resume/` for resume profiles, `papers/` for paper summaries).
- Use the same global header and footer pattern as existing pages (copy from a similar page).
- Include "About this site" tagline, theme toggle, back-to-top, and dynamic year in footer per **cryptozach-site-polish-audit** structural checks.
- Set `<title>`, canonical, and og/twitter meta; use **cryptozach-typography-copy** and **cryptozach-assets-and-paths** for paths and images.

## 2. Navigation and footer

Add a link to the new page in:

- **Desktop nav** (`.nav-links--desktop`): one `<a class="navlink" href="...">Label</a>`.
- **Mobile nav** (`.nav-links--mobile`): same link in the mobile linkset.
- **Footer nav** (`.footer-nav`): one `<a href="...">Label</a>`.

Update **every** HTML file that contains the main nav: root `*.html`, `resume/*.html`, `papers/*.html`. Use the same href (e.g. `./new-page.html` from root, `../new-page.html` from `resume/` or `papers/`).

## 3. Sitemap

Add an entry to `sitemap.xml`:

```xml
<url>
  <loc>https://cryptozach.com/new-page.html</loc>
</url>
```

Use the production URL and the actual filename.

## 4. Skills and docs that list pages

- **cryptozach-site-polish-audit**: the "Page inventory" table lists key pages. If the new page is a primary route (e.g. a new hub or profile), add a row to that table in `.cursor/skills/cryptozach-site-polish-audit/SKILL.md`.
- If the page is linked from **cryptozach-frameworks-crosslinks** or **cryptozach-research-index**, update those skills or the relevant HTML so anchors and links stay correct.

## 5. Redirects (if replacing an old URL)

If the new page replaces an existing URL, keep the old URL as a redirect (see **cryptozach-rename-route** or the `frameworks.html` / `speaker.html` pattern: minimal HTML with meta refresh and JS redirect to the new path).

## Quick verification

After edits, run a quick grep to ensure the new path appears in nav and sitemap:

```bash
grep -l 'new-page\.html' *.html resume/*.html papers/*.html 2>/dev/null | wc -l
grep 'new-page\.html' sitemap.xml
```

Then run **cryptozach-local-preview** and open the new page and click the new nav link from another page.
