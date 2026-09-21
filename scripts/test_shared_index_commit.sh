#!/usr/bin/env bash
# Proves the site pre-commit refuses a bare commit of the shared index and
# allows `git commit -- <paths>`, which leaves a peer-staged file uncommitted.
# A positive control (CZ_ALLOW_SHARED_INDEX=1) must still be able to commit
# the whole index, or the refusal could be a hook that commits nothing.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
HOOK_SRC=${1:-$ROOT/scripts/hooks/pre-commit}
[ -f "$HOOK_SRC" ] || { echo "missing hook $HOOK_SRC" >&2; exit 2; }
# The subject must be readable. A hook path that does not exist fails above.
BASE=${TMPDIR_SITE:-$ROOT/../Tokenization_Systems_Website/_build/shared-index-precision-2026-09-21/suite}
rm -rf "$BASE"
mkdir -p "$BASE/repo"
cd "$BASE/repo"
git init -q
git config user.email measure@local
git config user.name measure
mkdir -p .git/hooks
cp "$HOOK_SRC" .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo a > a.txt
echo b > b.txt
git add a.txt b.txt
# First commit is bare and MUST be refused once the check exists. Seed with the
# bypass so the fixture has a parent. The bypass is the positive control that
# the hook still commits when asked.
CZ_ALLOW_SHARED_INDEX=1 git commit -q -m "init both"
echo "seed_ok files=$(git show --name-only --format= HEAD | tr '\n' ' ')"

fail() { echo "FAIL: $1" >&2; exit 1; }

echo mine >> a.txt
echo peer >> b.txt
git add a.txt b.txt
set +e
git commit -q -m "bare should refuse" >"$BASE/bare.out" 2>"$BASE/bare.err"
bare_rc=$?
set -e
[ "$bare_rc" -ne 0 ] || fail "bare commit of the shared index was allowed (rc 0)"
grep -q 'staged-vs-committed' "$BASE/bare.err" || fail "refusal did not name staged-vs-committed"
echo "bare_refused rc=$bare_rc"

set +e
git commit -q -m "pathspec only a" -- a.txt >"$BASE/path.out" 2>"$BASE/path.err"
path_rc=$?
set -e
[ "$path_rc" -eq 0 ] || fail "pathspec commit refused (rc $path_rc): $(cat "$BASE/path.err")"
got=$(git show --name-only --format= HEAD)
[ "$got" = "a.txt" ] || fail "pathspec commit contained: $got"
left=$(git diff --cached --name-only)
[ "$left" = "b.txt" ] || fail "peer file not left staged: [$left]"
echo "pathspec_excluded_peer"

# Positive control: the bypass commits every staged path.
echo more >> b.txt
git add b.txt
CZ_ALLOW_SHARED_INDEX=1 git commit -q -m "bypass both" -- b.txt
# b.txt was the only staged path after the pathspec commit, so this is one file.
# Stage both again and bypass WITHOUT a pathspec.
echo m2 >> a.txt
echo p2 >> b.txt
git add a.txt b.txt
CZ_ALLOW_SHARED_INDEX=1 git commit -q -m "bypass bare"
both=$(git show --name-only --format= HEAD | tr '\n' ',')
[ "$both" = "a.txt,b.txt," ] || fail "bypass did not commit both: $both"
echo "bypass_commits_shared_index"

# Empty shared index (allow-empty) is not a sweep.
git commit -q --allow-empty -m "empty"
echo "empty_allowed"

# Merge stand-down. Record whether a dirty peer path rides into the merge.
git checkout -q -b side
echo side >> a.txt
git commit -q -m "side" -- a.txt
git checkout -q master 2>/dev/null || git checkout -q main
echo peer-during-merge >> b.txt
git add b.txt
set +e
git merge -q side -m "merge side" >"$BASE/merge.out" 2>"$BASE/merge.err"
merge_rc=$?
set -e
[ "$merge_rc" -eq 0 ] || fail "merge refused (rc $merge_rc): $(cat "$BASE/merge.err")"
mfiles=$(git show --name-only --format= HEAD)
[ "$mfiles" = "a.txt" ] || fail "merge commit swept the staged peer file: $mfiles"
mleft=$(git diff --cached --name-only)
[ "$mleft" = "b.txt" ] || fail "staged peer file did not survive the merge: [$mleft]"
echo "merge_left_peer_staged"
echo "PASS"
