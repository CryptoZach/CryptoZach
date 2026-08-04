#!/usr/bin/env python3
"""Pre-push layer (8): a new page cannot reach the public site unless somebody
asked whether it discloses unfiled subject matter.

WHY THIS EXISTS. On 2026-08-04 the /agent-infrastructure/ page was authored,
committed, pushed, and deployed with no 102(b) review anywhere in the chain. Its
authoring commit body is thorough about nav wiring, numeric predicates, and what
the page is not, and never asks the disclosure question once. The page happened
to be safe: the Synergy provisional (64/120,240) had been filed eight days
earlier and covers its largest disclosure. That was sequencing done right by a
different session for a different reason, not a control.

The program already had the procedure
(handoff/patent/csa_102b_public_disclosure_verification_2026-06-25.md in the
workflow clone). No publish surface invoked it. That is the teaching-versus-
enforcing gap the published page itself describes: a rule that depends on the
actor recalling it while acting is unenforced. This is the enforcing half.

WHY PUSH TIME AND NOT COMMIT TIME. Pushing this repository deploys to the live
site. Commit is reversible and private; push is the outward, effectively
irreversible act. A US grace period runs 12 months from publication, and
absolute-novelty jurisdictions (EPO, CN, and most others) give no grace at all,
so the harm attaches at publish and cannot be undone by a later revert.

FIRING RATE, MEASURED BEFORE SHIPPING (2026-08-04, this repository's own history,
1108 commits on HEAD):

    commits that ADD a page (dir/index.html)  21  =  1.90%, about 1 in 52
    same, excluding letters/ and papers/       7  =  0.63%, about 1 in 158

This gate uses the BROADER trigger, deliberately. Letters and papers are not
exempt: they are the lane where this program has already had real disclosure-
sequencing concerns (the C1 methodology-paper posting question, which the Synergy
filing was partly sequenced around). Carving them out would exempt the highest-
risk content.

PRECISION, STATED HONESTLY RATHER THAN FLATTERED. Of those 21 historical
firings, roughly one (the agent-infrastructure page) is a page where the
disclosure question needed real thought. Most new pages are letters, papers,
resume variants, or routing changes where the honest answer is one line. So this
control's hit rate for "a review that changed something" is low, and it is
shipped anyway because the cost asymmetry is extreme: a false fire costs about
ten seconds to write a trailer, and a miss costs foreign patent rights
permanently. That is the opposite trade from an advisory that fires thousands of
times to save a minute, which is the class this repository measured at an 81
percent repeat rate and called wallpaper.

It asks a question; it does not answer one. Only a human or counsel can.

Bypass: SKIP_DISCLOSURE_REVIEW_PREPUSH=1 git push ...
"""
import re
import subprocess
import sys

TRAILER = re.compile(r"^\s*Disclosure-review:\s*(\S.*)$", re.M | re.I)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          check=True).stdout


def main(local_oid, remote_oid):
    zero = "0" * len(local_oid)
    if local_oid == zero:
        return 0
    rng = f"{remote_oid}..{local_oid}" if remote_oid and remote_oid != zero else local_oid

    try:
        added = [p for p in git("diff", "--diff-filter=A", "--name-only", rng).splitlines()
                 if p.endswith("/index.html")]
        if not added:
            return 0
        bodies = git("log", "--format=%B%x00", rng).split("\x00")
    except subprocess.CalledProcessError:
        # Fail-soft on git errors, mirroring the sibling layers: a guard that
        # cannot read the range must not block a push on its own defect.
        return 0

    verdicts = [m.group(1).strip() for b in bodies for m in TRAILER.finditer(b)]
    if verdicts:
        print(f"pre-push: disclosure review recorded ({len(added)} new page(s)): "
              f"{verdicts[0][:90]}")
        return 0

    w = sys.stderr.write
    w("\npre-push: BLOCKED. This push publishes %d new page(s) and no commit in the\n"
      % len(added))
    w("  range records a disclosure review:\n")
    for p in added[:10]:
        w(f"    + {p}\n")
    if len(added) > 10:
        w(f"    ... and {len(added) - 10} more\n")
    w("\n  Publishing starts a 12-month US grace period under 35 USC 102(b)(1)(A)\n")
    w("  and forfeits absolute novelty in jurisdictions that grant no grace period.\n")
    w("  A later revert does not undo it.\n")
    w("\n  THE QUESTION: does any page above describe a mechanism that is not already\n")
    w("  in a filed application? Check the portfolio before answering; canonical\n")
    w("  state can lag a filing by days (it lagged Synergy 64/120,240 by eight).\n")
    w("    workflow clone: handoff/patent/submissions/*/FILING_ACKNOWLEDGMENT.md\n")
    w("    procedure:      handoff/patent/csa_102b_public_disclosure_verification_2026-06-25.md\n")
    w("\n  ADD ONE LINE to any commit in this push, then push again. Copy one:\n")
    w("\n    Disclosure-review: no new mechanism; page restates already-published work.\n")
    w("    Disclosure-review: mechanisms covered by <application number>, filed <date>.\n")
    w("    Disclosure-review: counsel cleared <date>, see <record>.\n")
    w("    Disclosure-review: DEFERRED, see handoff/unowned/<entry>.\n")
    w("\n    git commit --amend        (last commit)\n")
    w("    git rebase -i <base>      (an earlier one)\n")
    w("\n  Genuinely not a disclosure surface (a redirect stub, a routing change)?\n")
    w("  Say so in the trailer. Answering is the point; the answer can be one line.\n")
    w("\n  Bypass: SKIP_DISCLOSURE_REVIEW_PREPUSH=1 git push ...\n\n")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else ""))
