---
name: social-post-writer
description: "Generate platform-adapted social posts from academic research findings for X and LinkedIn. Use this skill whenever the user asks to write a tweet, thread, LinkedIn post, social post, or promotional content for any research paper, memo, or finding. Also trigger when the user says 'draft posts for this week', 'write a Routing Note', 'write an Equivalence Check', 'draft an event response', 'promote this finding', 'turn this into a post', 'social content', 'post bank', or references the promotion plan, content calendar, or any of the four series (Routing Notes, Equivalence Checks, Control-Layer Briefs, Operator Risk Notes). Trigger even for single posts, not just batches."
---

# Social Post Writer

Generate finding-first social media posts from academic research. Posts are adapted per platform and organized into four recurring series tied to the research program.

## Core rule

Every post follows this sequence:

1. **Finding** — what the data shows
2. **Mechanism** — why it happens
3. **Implication** — why the reader should care
4. **Single CTA** — one link or action (SSRN, site, or nothing)

## Platform rules

### X

- Lead with the finding or reframing, not the paper.
- Hook line: 180 characters max. Expand in the post body if needed.
- No hashtags (they suppress reach on X).
- No links in the post body. SSRN/site link goes in a reply or bio.
- No threads unless the user explicitly asks for one. Default to single posts.
- Voice: terse, mechanism-level, names actors and systems. Sounds like analysis, not promotion.

### LinkedIn

- Lead with an implication for someone's job, not an abstract finding.
- Hook above the fold (first ~150 characters visible before "see more").
- Structured detail below the fold: 2–3 sentences expanding the mechanism.
- End with who this matters for: name the audience ("If you're building tokenized products..." or "For allocators evaluating stablecoin exposure...").
- SSRN links go in the **first comment**, never the post body (reach suppression).
- Two to three hashtags only when directly relevant (#stablecoins, #tokenization, #monetarypolicy).
- No CT-style slang. No engagement bait. No "excited to announce."
- Voice: authoritative but not stiff. Write like you're briefing a portfolio manager who has three minutes.

### Cross-platform

- Never post identical content on both platforms.
- X gets the sharper claim. LinkedIn gets the operational implication.
- Same finding can be used on both platforms with different framing.

## Four recurring series

| Series | Promise to reader | Source papers | Primary platform |
|--------|-------------------|-------------|-----------------|
| **Routing Notes** | One empirical finding about gateways, monetary transmission, or stress routing | A1 (Routing the Dollar) | X |
| **Equivalence Checks** | One diligence question institutions should ask before tokenizing anything | A2 (MVEP) | LinkedIn |
| **Control-Layer Briefs** | One policy or legislative event explained through the router/operator lens | A3 (Dollar v3 / Control Layer War) + live events | X |
| **Operator Risk Notes** | One mechanism showing why token design is really institutional design under stress | B1 (Adaptive Tokenomics) / B4 (Operational Risk) | Both |

Series names are editorial guidance, not rigid labels. A post that crosses two series runs under whichever fits the hook. Do not force artificial categorization. Do not include the series name in the post text unless the user asks.

## Post types

### 1. Finding post (most common)

Single research finding adapted for the platform. One claim, one mechanism, one implication.

**X template:**
```
[Finding in ≤180 chars.]

[1–2 sentences: mechanism or context.]

[Optional: implication for a named audience.]
```

**LinkedIn template:**
```
[Hook: implication for the reader's work. Above the fold.]

[2–3 sentences expanding the mechanism and evidence.]

[Who this matters for: name the audience.]

[CTA: "Paper on SSRN (link in first comment)" or "Full framework at cryptozach.com"]
```

### 2. Event-driven post (Control-Layer Briefs)

Ties a live event (legislative milestone, depeg, supply milestone, product announcement) to a research finding.

**Template (both platforms):**
```
[What happened — one sentence.]

[What it means through the research lens — 1–2 sentences citing the relevant framework or finding.]

[Optional: "We measured this in [paper name]. The data shows [X]."]
```

**Pre-built frames for common event types:**

**GENIUS Act rulemaking:**
> [Event.] GENIUS targets the issuer. The routing layer is still untouched. Compliance obligations attach at the token-issuance layer but enforcement operates at the gateway where payment stablecoins and yield products intermingle.

**Stablecoin supply milestone:**
> Stablecoin supply just crossed [X]. The aggregate number is a bad proxy for what's happening underneath. The co-movement with Fed balance-sheet variables is regime-dependent: strongest during QT, weakest during easing. And it distributes unevenly across the gateway layer.

**Depeg or stress event:**
> [Event.] During SVB, capital moved across gateways, not out of dollar stablecoins. Fragmentation was competition within dollar infrastructure, not substitution into non-dollar instruments. Is this episode following the same pattern?

**Tokenization product announcement:**
> [Who announced what.] The MVEP framework tests whether a tokenized product preserves legal rights, operational resilience, and economic behavior under stress. Nine categories. The three hardest to retrofit after launch: system of record, reconciliation, and custody.

**DePIN token launch or failure:**
> [Event.] Every emission schedule decays. The question is whether the mechanism adapts before participation collapses. Most don't.

### 3. Conference/venue post

Factual announcement. No hype.

**Accepted:**
> [Paper title] accepted for [venue], [date]. [One-line thesis.] Pre-print on SSRN.

**Post-conference:**
> Three things the discussant pushed back on. [List.] Two I agree with. One I don't. Here's why.

### 4. Weekly batch

When the user asks for a week's worth of posts, produce:
- 4 X posts (2 Routing Notes, 1 Control-Layer Brief or event response, 1 Equivalence Check or Operator Risk Note)
- 2 LinkedIn posts (Tuesday: institutional finding; Thursday: policy implication or diligence tool)
- For each post, note the series label and source paper

## Prohibited patterns

| Pattern | Why |
|---------|-----|
| "Excited to share" / "Thrilled to announce" | Promotional tone. State the fact. |
| "This paper explores" / "In my latest research" | Abstract framing. Lead with the finding. |
| Paper abstracts as posts | Too long, too academic, wrong audience. |
| CTA stack (multiple links/actions) | One destination per post. |
| Hashtags on X | Suppress reach. |
| Links in LinkedIn post body | Suppress reach. First comment only. |
| Tagging people who didn't ask | Presumptuous. |
| Cross-posting identical content | Each platform needs adapted framing. |
| Acronyms in the hook (CLII, MVEP, VECM) | Audience doesn't know them yet. Explain first, name later. |

## Voice calibration

The posts should sound like analysis, not marketing. Specific calibrations:

- **Name actors:** "Circle," "Coinbase," "permissionless DEX" — not "issuers," "platforms," "protocols."
- **Name mechanisms:** "code-level dependencies," "reserve concentration," "gateway-tier divergence" — not "systemic risk" or "contagion."
- **Measured language:** "evidence consistent with," "the data shows" — not "proves" or "confirms."
- **No negatives:** Use affirmative constructions per the site copy rules. "The gateway determines the regulatory surface" not "the token doesn't determine the regulatory surface."

## Reply format

When drafting replies to other people's posts:

**Finding → mechanism → implication.**

Keep to 2–3 sentences. Lead with data, not opinion.

Example: "Observed routing moved across gateways, not out of dollar-pegged rails. That matters because token-level stress can be a bad proxy for infrastructure-level stress."

## LinkedIn first comment

Always draft the first comment alongside the LinkedIn post:

```
Paper: [title]
SSRN: [URL]
Site: cryptozach.com
```
