# Restore the site to CryptoZach/CryptoZach

The **live site** (www.cryptozach.com) should be served from **CryptoZach/CryptoZach**, not from Research-Publications-and-Data/meshnet-depin-simulation. This workspace has the restored content (resumes, contact, paper redirects). Use it to restore the live site.

## Where the site lives

| What | Where |
|------|--------|
| **Live site repo** | **https://github.com/CryptoZach/CryptoZach** |
| **Clone (HTTPS)** | `https://github.com/CryptoZach/CryptoZach.git` |
| **GitHub Pages** | Enable in repo **Settings → Pages** (branch: **main**). |
| **Custom domain** | In **Settings → Pages**, set **www.cryptozach.com** and add **CNAME** in repo root if asked. |

The repo **Research-Publications-and-Data/meshnet-depin-simulation** is for the DePIN simulation and papers; it is **not** the website. The `publications` remote in this workspace points there for reference only. Do not use it for the live site.

## Restore the live site from this workspace

This workspace has the fixes: `resume.html`, `contact.html`, `resumes/` (PDFs), paper redirect pages, and the root-cause doc. To make the live site match what you see on localhost:8080:

1. **Commit any remaining site changes** (if you have uncommitted edits you want on the live site):
   ```bash
   git status   # review
   git add <files>
   git commit -m "Your message"
   ```

2. **Push to CryptoZach/CryptoZach** (this updates the live site after Pages rebuilds):
   ```bash
   git push origin main
   ```

3. **Confirm GitHub Pages and domain**
   - Go to **https://github.com/CryptoZach/CryptoZach** → **Settings** → **Pages**.
   - Source: **Deploy from a branch**; branch: **main** (or the branch you push).
   - Custom domain: **www.cryptozach.com** (or your canonical domain). If you use a custom domain, ensure **CNAME** exists in the repo root with that domain.
   - After a push, Pages may take 1–2 minutes to rebuild.

4. **Check the live site**  
   Open https://www.cryptozach.com (or https://cryptozach.github.io/CryptoZach/ if no custom domain). It should match what you see at http://localhost:8080 after you run `npm run serve` from this repo.

## Why localhost:8080 was mostly blank (and what was fixed)

This workspace was missing **script.js** and **assets/brand/** (favicons, og-image). Pages loaded but had no theme toggle or other JS behavior and missing icons, so they looked blank or broken. The live site stayed populated because it still had those files from before the force push.

**Restored in this workspace:**
- **script.js** from the `website-updates` branch (theme toggle, menu, back-to-top, etc.).
- **assets/brand/** (favicon.ico, favicon-32.png, apple-touch-icon.png, og-image.png) from the live site so localhost:8080 matches.

After pulling or using this commit, run `npm run serve` and open http://localhost:8080: pages should be populated like the live site.

## What differs on the live site vs “original”

On the live site, only these differ from what you originally had:
- **resume.html** and **contact.html** (recreated versions; live has them).
- **/papers** (broken: missing or 404s for some paper pages).

This workspace has the same resume and contact pages plus paper redirect pages so /papers links work. Pushing **main** to **origin** will update the live site so it has script.js, assets, resume, contact, and working paper redirects.

## Remotes in this workspace

- **origin** → **CryptoZach/CryptoZach** (the live site repo). Use `git push origin main` to update the site.
- **publications** → Research-Publications-and-Data/meshnet-depin-simulation (simulation/papers repo, not the website).
