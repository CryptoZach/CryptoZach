# Root cause: broken resume and paper links

## What broke

- **Resume PDF/DOCX links** (e.g. `/resumes/Zukowski_Targeted_Resume_Versions_No_Orphans/Zukowski_Resume_Policy.pdf`) return 404 because the `resumes/` directory and files are missing from the current branch.
- **Paper summary links** (e.g. `./papers/routing-the-dollar.html`, `./papers/minimum-viable-equivalence-packs.html`, `./papers/dollar-v3-control-layer-war.html`, `./papers/tokenized-equity.html`, `./papers/routing-the-dollar-brief.html`) point to pages that do not exist on the current branch. Only `papers/adaptive-tokenomics.html` and `papers/operational-risk-token-economies.html` exist.
- **resume.html** and **contact.html** were missing from the live site (they were recreated in a later pass).

## Why it happened

The breakage came from **overwriting CryptoZach/CryptoZach with a different repo’s history**.

1. **Wrong remote / wrong tree**  
   The workspace was (or had been) cloned from or pointed at **Research-Publications-and-Data/meshnet-depin-simulation**. That repo has a different purpose (agent-based DePIN simulation, codex package, etc.) and a different file tree.

2. **Force push replaced the live site**  
   When we ran `git push cryptozach main --force-with-lease` (or equivalent), we pushed this workspace’s `main` branch to **CryptoZach/CryptoZach**. That `main` branch was built on top of the meshnet-depin-simulation lineage (initial commit: "Initial commit: agent-based DePIN simulation with PID control and operational risk"). So the **entire previous `main`** on CryptoZach/CryptoZach was replaced by that other project’s tree plus the research-merge and resume-hub commits.

3. **The tree we pushed did not contain**  
   - The **resumes/** directory and its PDF/DOCX files (they existed on the old CryptoZach `main`, and also exist in an older branch in this clone at commit `6e07705`).  
   - Most **paper summary pages** (routing-the-dollar, routing-the-dollar-brief, minimum-viable-equivalence-packs, dollar-v3-control-layer-war, tokenized-equity). The meshnet-derived tree only had two paper pages (adaptive-tokenomics, operational-risk-token-economies).  
   - **resume.html** and **contact.html** (we recreated them afterward).

So: **the cause was force-pushing a different repo’s `main` into CryptoZach/CryptoZach**, which replaced the real site with a tree that never had the resume assets, most paper pages, or the original hub/contact pages.

## What we can recover from this clone

- **Resume PDFs and DOCX**  
  They exist at commit **6e07705** (e.g. `resumes/Zukowski_Targeted_Resume_Versions_No_Orphans/Zukowski_Resume_Policy.pdf`). We can restore that directory from that commit into the working tree and commit it on `main` so the current resume links work.

- **Paper summary pages**  
  In this clone, **no branch** contains `papers/routing-the-dollar.html`, `papers/minimum-viable-equivalence-packs.html`, `papers/dollar-v3-control-layer-war.html`, `papers/tokenized-equity.html`, or `papers/routing-the-dollar-brief.html`. So they cannot be recovered from git here. Options: recreate them from content/copy or another backup, or point links to external URLs if the papers live elsewhere.

## How to avoid this next time

- Before any **force push** to a production repo (e.g. CryptoZach/CryptoZach), confirm that the branch being pushed is the correct lineage and contains all expected assets (resumes, papers, contact, resume hub).
- Prefer a **non-force** merge or a separate “site restore” branch so the canonical site repo is not overwritten by an unrelated history.
- Ensure the **default remote** for this workspace is CryptoZach/CryptoZach (or a fork of it), not meshnet-depin-simulation, so normal pushes go to the right place.
