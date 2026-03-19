# Playwright end-to-end smoke tests

Static HTML preview still uses Python from the repo root:

```bash
python3 -m http.server 8080
```

End-to-end checks use **Playwright Test** against that same port.

## Prerequisites

- **Node.js** 18+ (see [Playwright system requirements](https://playwright.dev/docs/intro#system-requirements))
- **Python 3** on `PATH` (used by `webServer` in `playwright.config.js` to serve the site on **8080**)

## One-time setup

From the repository root:

```bash
npm install
npx playwright install
```

`playwright install` downloads browser binaries (needs network).

## Run tests

```bash
npm run test:e2e
```

Tests run in **three Chromium viewports** (see `playwright.config.js`):

| Project   | Role   | Viewport (approx.)   |
|-----------|--------|----------------------|
| `desktop` | Chrome | Default desktop      |
| `tablet`  | Chrome | 834×1112             |
| `mobile`  | Chrome | Pixel 5 profile      |

Run one project only:

```bash
npx playwright test --project=desktop
npx playwright test --project=tablet
npx playwright test --project=mobile
```

`tests/e2e/responsive.spec.js` checks **no horizontal overflow** on key pages and **navigation** (desktop nav vs hamburger) by width.

Optional UI mode:

```bash
npm run test:e2e:ui
```

Playwright starts `python3 -m http.server 8080` automatically. If something is already listening on **8080**, the config **reuses** that server by default. Set **`PLAYWRIGHT_FRESH_SERVER=1`** to always spawn a new server (useful when no server is running; fails if **8080** is busy).

## After a failed run

```bash
npx playwright show-report
```

## Port conflicts

If **8080** is in use and you do not want reuse, stop the other process (for example `lsof -i :8080`) or change the port in **`playwright.config.js`** (`webServer` and `use.baseURL`) together.

## Related

- **[`.cursor/skills/cryptozach-local-preview/SKILL.md`](../.cursor/skills/cryptozach-local-preview/SKILL.md)** for manual preview, MCP smoke URLs, and this test flow
