# CryptoZach — GitHub Pages Site

This repository is ready to publish as a GitHub Pages site.

## What’s included

- `index.html` — institutional-facing landing page (default)
- `/assets/` — shared CSS + JS for the main page
- `/fed/` — Fed/FRBNY-coded variant page (`/fed/index.html`)

## Quick deploy (GitHub Pages)

1. Create a repo named **`cryptozach.github.io`** under the **@CryptoZach** account.
2. Upload these files to the repo root.
3. In GitHub: **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
4. Your site will be live at `https://cryptozach.github.io/`.
   - Fed/FRBNY-coded variant: `https://cryptozach.github.io/fed/`

## Required edits

### 1) Contact form endpoint (main page)
The main page uses a Formspree endpoint. Replace the placeholder in `index.html`:

```html
<form action="https://formspree.io/f/REPLACE_ME" method="POST">
```

Create your own form at Formspree and paste your form ID.

### 2) Update any links
Open `index.html` and confirm your:
- LinkedIn
- X (Twitter)
- Medium
- Email address

### 3) Optional downloads
If you want to host PDFs (resume, cover letter, writing-sample abstracts), add them under `/assets/` and link them from the page.

## Notes
- This is static HTML/CSS/JS (no build step).
- `.nojekyll` is included to keep GitHub Pages from altering paths.
