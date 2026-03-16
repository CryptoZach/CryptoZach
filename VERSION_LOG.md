# Version log

Use this log to revert the site to a known good state. Each entry is a git commit you can checkout.

## Versions

| Commit    | Date       | Description |
|-----------|------------|-------------|
| `464a92d` | 2026-03-16 | Research cards: full-card link for Gamification/Intro, Thread in meta row, thread click handler; no-thumb class layout reverted |

**Tag:** `v2026-03-16-research-cards` (points at 464a92d). Already created; use it to revert anytime.

## How to revert

- **Revert to a specific version (discard later commits):**
  ```bash
  git checkout <commit-hash>
  ```
  Example: `git checkout 464a92d`

- **After creating the tag above, revert to this snapshot anytime:**
  ```bash
  git checkout v2026-03-16-research-cards
  ```

- **Create a new branch from a version (keep main unchanged):**
  ```bash
  git checkout -b restore-mar16 464a92d
  ```

- **See what changed since a version:**
  ```bash
  git log 464a92d..HEAD --oneline
  ```

## Adding new versions

When you commit a state you may want to revert to later:

1. Commit your changes: `git add ... && git commit -m "Description"`
2. Add a row to the table above: commit hash (`git log -1 --format="%h"`), date, short description
3. Optionally create a tag: `git tag vYYYY-MM-DD-short-name`

---

## Website Designer skill (reference)

Design, edit, and maintain the cryptozach.com research site. Use when editing any page, improving copy/layout, normalizing terms, adding sections, or making HTML/CSS/JS changes.

**Source:** `website-designer-SKILL.md` (and `Skills/Website Designer` for hero/copy baselines).

### Site identity

- **Owner:** Zach Zukowski · **Domain:** cryptozach.com
- **Purpose:** Seven-paper research program, three role-targeted resumes, unified thesis for hiring teams, policy audiences, institutional partners.
- **Tone:** Institutional research studio. High-trust, calm, precise. Not a startup landing page.

### Design guardrails

- Premium, editorial, institutional, research-led. Calm and modern; restrained depth.
- No flashy gradients, generic SaaS look, noisy glassmorphism, oversized shadows, gimmicky animation.
- Serif or refined sans-serif; no generic system fonts. Improve hover/focus/active states; respect `prefers-reduced-motion`; preserve semantics and keyboard access; no framework or build step.

### Copy rules

- Authoritative, precise, operational. Specific actors over abstract wording; concrete terms over vague metaphors; tight, scannable sentences.
- **Prohibited:** Em-dashes; "not just X," "rather than X," "more than X," "not only," "beyond" (as negation); "plumbing" (use "settlement, custody, and ledger infrastructure"); "measurable in operation" (use "auditable in practice" or "observable in live operations").
- **Prefer:** "from policy to execution" (not "policy-to-implementation"); "regulators, issuers, and market operators can act on" (not "operators actually use"); name the actor instead of "stakeholders."

### Canonical terms (authority list)

- **Section headings:** What I work on, How the work runs, Best for, What this version should make clear quickly, Questions this version is built to answer, Supporting research, Contact.
- **Role labels (sentence case):** Policy & market infrastructure, Asset management & tokenization, Stablecoin & payments strategy.
- **Track labels:** Digital money, tokenization, and market infrastructure; Tokenomics and physical network systems (DePIN).
- **Status badges:** Under review, Best first read, Public, Public / requestable, Available on request, Draft.
- **Research cards:** "What it is:" / "Why it matters:" / "Who it's for:"

### Page inventory

| File | Purpose |
|------|---------|
| `index.html` | Homepage: hero, audience routing, featured research, method/output, selected research preview, contact |
| `selected-research.html` | Full research catalog (both tracks) |
| `resume.html` | Resume hub → three role-targeted profiles |
| `resume/policy-market-infrastructure.html` | Policy-facing profile |
| `resume/asset-management-tokenization.html` | Investor-facing profile |
| `resume/stablecoin-payments-strategy.html` | Operator-facing profile |
| `contact.html` | Contact page with quick actions |
| `start-here.html` | Orientation; shortest path into thesis |
| `focus.html` | Method, scope, output types |
| `tokenomics-research.html` | DePIN/tokenomics track |
| `404.html` | Error page; global find/replace only |

### Execution workflow

1. **Audit** current state; **check canonical terms** (section 4 in skill) and **copy rules** (section 3).
2. **Implement** in existing HTML/CSS/JS; **preview and iterate**; **verify** labels, badges, headings, CTAs.
3. **QA checklist:** Role labels identical; core vocabulary consistent; status badges and section headings canonical; research cards use What it is / Why it matters / Who it's for; CTAs exact; no em-dashes or negatives in copy; hero right side not empty; responsive at 375px, 768px, 1280px.
