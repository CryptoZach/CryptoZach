---
name: website-designer
description: "Design, build, and edit the cryptozach.com research site. Use this skill whenever the user asks to edit any page on the site, improve copy or layout, implement the normalization patch, add a new page or section, fix visual hierarchy, polish the hero, adjust responsive behavior, or make any HTML/CSS/JS change to the site. Also trigger when the user says 'update the site', 'fix the homepage', 'make it look better', 'implement the patch', 'normalize the copy', 'add a research card', 'update the resume page', or references any page by name (index, resume, contact, focus, selected-research, start-here). Trigger even for small edits like changing a badge label or swapping a CTA string."
---

# Website Designer: cryptozach.com

Design, edit, and maintain a research-led personal site about digital money, tokenization, and market infrastructure. The site serves three audiences: policy designers, asset managers, and protocol/stablecoin operators.

## 1. Site identity

**Owner:** Zach Zukowski
**Domain:** cryptozach.com
**Purpose:** Present a seven-paper research program, three role-targeted resumes, and a unified thesis to hiring teams, policy audiences, and institutional partners.
**Unified thesis:** Who routes the dollar matters more than which dollar is routed. Who earns the token matters more than who holds it. Classify the token, but regulate and audit the operator.
**Tone:** Institutional research studio. High-trust, calm, precise. Not a startup landing page.

## 2. Design system

### Aesthetic guardrails

- Premium, editorial, institutional, research-led
- Calm and modern with restrained depth
- No flashy gradients, generic SaaS look, noisy glassmorphism, oversized shadows, or gimmicky animation
- Serif or refined sans-serif typography; never generic system fonts (Inter, Roboto, Arial)
- Dominant colors with sharp accents; no timid, evenly-distributed palettes
- Asymmetry and editorial composition over cookie-cutter grid layouts
- Match complexity to vision: minimalist designs need restraint and precision; elaborate layouts need follow-through

### Interaction standards

- Improve hover, focus, and active states on every edit pass
- Respect `prefers-reduced-motion`
- Preserve semantic HTML structure and keyboard accessibility
- Keep performance lightweight; no framework or build step
- Do not introduce React, Vue, or any JS framework

### Responsive behavior

- Desktop-first editorial layout with clean mobile stacking
- Line lengths capped for readability (max ~65ch for body copy)
- Support points / cards: 3-up grid on desktop, stacked on mobile
- Test hero, cards, and CTA blocks at 375px, 768px, and 1280px minimum

## 3. Copy rules

### Voice

- Authoritative, precise, operational
- Prefer specific actors and systems over abstract wording
- Replace vague metaphors with concrete terms
- Keep sentences tight and fast to scan
- Sound authoritative, never promotional
- Preserve sophistication without hiding behind jargon

### Prohibited patterns

| Pattern | Replacement |
|---------|-------------|
| Em-dashes | Commas, semicolons, or parentheses |
| "not just X" | "X and Y together" or "X grounded in Y" |
| "rather than X" | "while preserving X" or "with Y built in" |
| "more than X" | "central to," "key driver of," or "determinant of" |
| "not only" | "the full system includes..." |
| "beyond" (as negation) | "with ... built in," "supported by ...," or "anchored in ..." |
| "plumbing" | "settlement, custody, and ledger infrastructure" |
| "control surfaces" | "control layer" (unless intentional contrast) |
| "control points" (meaning observables) | "control-layer metrics" |
| "measurable in operation" | "auditable in practice" or "observable in live operations" |

### Language preferences

| Avoid | Prefer |
|-------|--------|
| "policy-to-implementation" | "from policy to execution" or "from policy to operating model" |
| "operators actually use" | "regulators, issuers, and market operators can act on" |
| generic "stakeholders" | Name the actor: "issuers," "custodians," "risk committees" |
| "ecosystem" (vague) | Name the system: "gateway infrastructure," "DePIN token economy" |

## 4. Canonical terms

These are the authority list. If any page uses a variant, replace it.

### Section headings (exact)

- What I work on
- How the work runs
- Best for
- What this version should make clear quickly
- Questions this version is built to answer
- Supporting research
- Contact (heading only; CTA buttons may say "Get in touch")

### Role labels (sentence case, identical everywhere)

- Policy & market infrastructure
- Asset management & tokenization
- Stablecoin & payments strategy

### Track labels

- Digital money, tokenization, and market infrastructure
- Tokenomics and physical network systems (DePIN)

### Status badges

- Under review
- Best first read
- Public
- Public / requestable
- Available on request
- Draft

### CTA labels (exact)

- View resume (PDF)
- Download DOCX
- Request a writing sample
- View all research
- Request a 1-page overview
- Discuss a policy / product question

### Resume link labels (exact)

- View policy & market infrastructure resume
- View asset management & tokenization resume
- View stablecoin & payments strategy resume

### Research card labels

- What it is: / Why it matters: / Who it's for:

## 5. Page inventory

| File | Purpose | Key sections |
|------|---------|-------------|
| `index.html` | Homepage; hero, audience routing, featured research, method/output summary | Hero, audience cards, "What I work on", "How the work runs", selected research preview, contact strip |
| `selected-research.html` | Full research catalog across both tracks | Featured paper, Track A cards, Track B cards, earlier work |
| `resume.html` | Resume hub; routes to three role-targeted profiles | Role cards with CTAs, "What I can send" strip |
| `resume/policy-market-infrastructure.html` | Policy-facing resume profile | Best for, Core signals, Decision lens, snapshot, questions, supporting research |
| `resume/asset-management-tokenization.html` | Investor-facing resume profile | Same structure as policy |
| `resume/stablecoin-payments-strategy.html` | Operator-facing resume profile | Same structure as policy |
| `contact.html` | Contact page with quick actions | Contact heading, quick asks, direct contact, "What I can send" |
| `start-here.html` | Orientation page; shortest path into the thesis | Overview, featured paper, role routing, utility box |
| `focus.html` | Detailed view of method, scope, and output types | "What I work on", "How the work runs", five questions |
| `tokenomics-research.html` | DePIN/tokenomics track detail (if exists) | Track B cards |
| `404.html` | Error page | Minimal; global find/replace only |

## 6. Hero specification (index.html)

**Eyebrow:** "Digital money, tokenization, and market infrastructure."

**H1:** "Digital money and tokenization research for real-world policy and operating constraints."

**Method line:** "I translate policy, infrastructure constraints, and stress behavior into scenario trees, monitoring thresholds, escalation pathways, and control-layer metrics."

**Output line:** "I build decision memos, operating gates, and monitoring frameworks that hold under stress."

**Support points (3-up cards or editorial rows):**
- **Method:** Evidence-led research built on validated datasets, stress simulations, and named decision thresholds. Every claim is replicable; every framework is tested against adversarial conditions.
- **Scope:** Stablecoins, tokenized deposits, yield wrappers, and DePIN token economies, with the settlement, custody, governance, and risk-control infrastructure behind them.
- **Goal:** Frameworks that hold under stress, govern real operations, and help the people building and regulating these systems make better decisions.

**Design requirements for hero:**
- Fill the right side intentionally: restrained visual panel, trust rail, or structured secondary block. Never leave it empty.
- Clear hierarchy: eyebrow → name → subhead → support points → badges → CTAs
- Line lengths capped for editorial readability
- Badges and metadata refined, never incidental
- Strong CTA hierarchy with deliberate spacing

## 7. Execution workflow

### For any edit

1. **Audit.** Read the current state of the target file(s). Identify the specific problems.
2. **Check canonical terms.** Cross-reference section 4. If the page uses any non-canonical variant, fix it as part of the edit.
3. **Check copy rules.** Scan for prohibited patterns (section 3). Fix any violations.
4. **Implement.** Edit HTML, CSS, and JS directly. Work in the existing files.
5. **Preview and iterate.** Inspect spacing, hierarchy, and responsive behavior. Do not stop at the first pass.
6. **Verify.** Confirm role labels, CTA labels, status badges, and section headings match the canonical list exactly.

### For a full normalization pass

Follow the execution order in the normalization patch:

1. Run global find/replace across all HTML in scope (section 4 canonical terms).
2. Apply file-by-file changes in order: index → selected-research → resume → resume profile pages (×3) → contact → start-here → focus.
3. Append CSS only if wording changes cause layout issues.
4. Run QA checklist.

### QA checklist (run after every edit session)

- [ ] Role labels identical on every page
- [ ] Core vocabulary consistent (control layer, scenario trees, monitoring thresholds, escalation pathways)
- [ ] Status badges match canonical list
- [ ] Section headings match canonical list
- [ ] All research cards use "What it is:" / "Why it matters:" / "Who it's for:"
- [ ] CTAs match canonical list exactly
- [ ] No em-dashes in rendered copy
- [ ] No negatives in rendered copy
- [ ] Hero right side is not empty
- [ ] Responsive layout holds at 375px, 768px, 1280px

## 8. Common tasks

### Add a research card

1. Determine track (A or B) and status badge.
2. Write "What it is:" (finding, not topic), "Why it matters:", "Who it's for:" (named audiences).
3. Match card HTML structure to existing cards on `selected-research.html`.
4. Verify no stats in the card copy; explain findings in plain language.

### Update a resume profile page

1. Confirm section labels match section 4.
2. Verify "Questions this version is built to answer" section exists.
3. Check that supporting research intro reads: "These papers are the closest match for how this version frames the work."
4. Confirm closing heading matches the page-specific pattern from section 5.

### Polish a section

1. Read the current copy aloud (mentally). Flag anything that sounds vague, promotional, or jargon-heavy.
2. Apply copy rules (section 3) and language preferences.
3. Tighten: if a sentence can lose a clause without losing meaning, cut it.
4. Check visual hierarchy: does the heading, subhead, body, CTA cascade read correctly at a glance?
5. Verify responsive stacking.
