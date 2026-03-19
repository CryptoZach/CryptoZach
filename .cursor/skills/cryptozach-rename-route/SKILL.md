---
name: cryptozach-rename-route
description: "Checklist for renaming or moving a page or route on cryptozach.com so no links break. Use when the user renames a file (e.g. speaker.html to speaker-advisory.html), moves a page to a new path, or changes a URL. Trigger on 'rename page', 'move page', 'change URL', 'redirect old URL', or when replacing one HTML file with another. Ensures all hrefs, sitemap, and skills are updated and a redirect is in place for the old URL."
---

# Rename or move route checklist

When renaming or moving a page, update every reference and add a redirect for the old URL so bookmarks and external links still work.

## 1. Find all references

From repo root, search for the old path (with and without leading slash, and with `./` for relative):

```bash
grep -rn 'old-page\.html\|href="\./old-page\|href="\.\./old-page' *.html resume/*.html papers/*.html
grep -n 'old-page\.html' sitemap.xml script.js
grep -rn 'old-page' .cursor/skills/
```

Note every file and line that references the old path.

## 2. Create the new page and update internal links

- If renaming: copy or move content to the new file (e.g. `new-page.html`). Update canonical, og:url, and any self-links inside that file to the new path.
- In **every** file that linked to the old path, replace the href with the new path. Preserve relative style: `./new-page.html` from root, `../new-page.html` from `resume/` or `papers/`.
- Update **nav and footer** on all pages (same as **cryptozach-new-page**): desktop nav, mobile nav, footer nav. Update link text if the label changes (e.g. "Speaker" to "Speaker & Advisory").

## 3. Sitemap and scripts

- In `sitemap.xml`, replace the old URL with the new URL (or add the new and remove the old).
- In `script.js` or any other JS that references the path (e.g. sticky nav or routing), update to the new path.

## 4. Skills and docs

- In **cryptozach-site-polish-audit**, update the "Page inventory" table if the old filename is listed; use the new filename.
- In any other skill or doc under `.cursor/skills/` or `docs/` that mentions the old path, update to the new path.

## 5. Redirect for the old URL

Replace the **old** file with a minimal redirect page so the old URL still works. Use the same pattern as `frameworks.html` and `speaker.html`:

- `<title>Moved to [New Page Name]</title>`
- `<meta name="robots" content="noindex" />`
- `<link rel="canonical" href="https://cryptozach.com/new-page.html" />`
- `<meta http-equiv="refresh" content="0; url=new-page.html" />`
- A small script: `window.location.replace("new-page.html" + search + hash);`
- Body: one paragraph with a link to the new page.

Use a **relative** URL in the redirect (e.g. `new-page.html`) so it works from any base path. Preserve query and hash if desired (e.g. `?foo` and `#section`).

## 6. Verify

- Run `grep -rn 'old-page\.html'` again; the only remaining reference should be inside the redirect file (e.g. in comments or in the redirect target if you use a different pattern).
- Run **cryptozach-local-preview** and open the old URL; it should redirect to the new URL. Click nav links to confirm they point to the new page.
