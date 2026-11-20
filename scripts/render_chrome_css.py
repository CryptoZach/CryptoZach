#!/usr/bin/env python3
"""render_chrome_css.py: stamp the shared header, mobile menu and footer styles into the one page
that does not load styles.css (the homepage, index.html), derived from the stylesheets every other
page loads.

WHY THIS EXISTS. scripts/render_chrome.py stamps _partials/header.html and _partials/footer.html
into every page, so the chrome's MARKUP has one source. Its STYLES did not: interior pages style
the chrome from styles.css and vault.css, while index.html loads neither and carried its own copy
of the header, menu and footer CSS, so every chrome fix had to be made twice (the unowned entry
homepage-is-the-one-page-outside-the-shared-chrome-so-every-header-fix-must-be-made-twice, whose
end state the author chose on 2026-08-28: enrol the homepage in the shared chrome). Loading the
whole of styles.css on the homepage would merge two design systems on the page that matters most.
This script instead derives, from styles.css and vault.css, exactly what the chrome needs, so a
chrome fix is still made once (in styles.css, vault.css or a partial) and reaches the homepage
when this is re-run. The styles are stamped inline, between the site-chrome:css START and END
markers in index.html (the homepage loads no external stylesheet, and this keeps it that way), the
same way render_brand.py stamps the brandmark. Interior pages are not touched.

WHAT IS CARRIED, in the source order of styles.css then vault.css (the order interior pages load
them), inside the same @media / @supports / @container wrappers:
  1. CHROME RULES: a rule whose selector's subject sits inside the chrome. The chrome's vocabulary
     is read from the partials themselves (every class and id they use, plus the header and footer
     elements), less UTILITY classes the partials borrow from the rest of the site. A selector list
     that mixes chrome and other selectors keeps only its chrome selectors.
  2. TOKENS: the custom properties of every :root or html token block, re-targeted onto the chrome
     roots as `<that root selector> :where(header, #nav-mobile, footer.sf)`, so the chrome reads the
     interior palette and scale whatever the page's own tokens are. Only :where() is added, so the
     specificity that decided between theme blocks is unchanged.
  3. BASE TYPE: the inheritable declarations of body (and html) rules, onto the chrome roots, so the
     chrome inherits what it inherits on an interior page.
  4. ELEMENT DEFAULTS and UTILITIES: a rule with no class and no id (a, button, svg, *, [hidden],
     :focus-visible ...), and the borrowed utility classes, scoped under the chrome roots with
     :where(), which keeps their own specificity. A selector the root itself can match (*, [hidden])
     is also emitted for the root.
  5. KEYFRAMES a carried rule names.
0. Before all of it, a zero-specificity `all:revert` on every chrome element (SVG excepted), so a
     chrome element takes nothing from the page's own CSS (see RESET).
Everything else is dropped. `.reveal` is deliberately not carried: it hides an element until
script.js's observer marks it visible, and the homepage does not run that observer.

THE HOMEPAGE'S OWN CSS sits in `@layer home`, so these unlayered rules win every conflict on a
chrome element without reordering anything the homepage styles for itself.

Modes:
    --write  (default) restamp the region in index.html
    --check  exit 1 when the region is not what --write would stamp (CI: build-deploy.yml)
Stdlib only. Resolves the tree from cwd, falling back to the script's clone.
"""
import argparse
import hashlib
import os
import re
import subprocess
import sys

SOURCES = ("styles.css", "vault.css")
PARTIALS = ("_partials/header.html", "_partials/footer.html")
TARGET = "index.html"
ROOTS = "header, #nav-mobile, footer.sf"
WHERE = ":where(%s)" % ROOTS
# Classes the partials use that are site-wide utilities, not chrome: carried scoped (or not at all).
UTILITY = {"icon", "visually-hidden"}
NOT_CARRIED = {"reveal"}
# Classes the chrome's script puts on html while the menu is open: a rule keyed on one is chrome
# behaviour (the scroll lock, the header lifted over the panel) wherever its subject sits.
STATE = {"nav-mobile-open"}
INHERITED = {
    "color", "font", "font-family", "font-size", "font-weight", "font-style", "font-stretch",
    "font-variant", "font-variant-numeric", "font-variant-ligatures", "font-feature-settings",
    "font-variation-settings", "font-kerning", "font-optical-sizing", "font-synthesis",
    "line-height", "letter-spacing", "word-spacing", "text-rendering", "text-align",
    "text-transform", "text-indent", "text-shadow", "white-space", "hyphens", "tab-size",
    "-webkit-font-smoothing", "-moz-osx-font-smoothing", "-webkit-text-size-adjust",
    "text-size-adjust", "-webkit-tap-highlight-color", "color-scheme", "caret-color",
    "accent-color", "cursor", "quotes", "list-style", "list-style-type", "overflow-wrap",
    "word-break", "font-display",
}
CONTAINER_AT = ("media", "supports", "container", "document", "scope")
# 0. ISOLATION, first in the region: a chrome element takes NOTHING from the page's own (layered) CSS.
# Unlayered, it beats every @layer home declaration; at zero specificity and first, every carried rule
# still overrides it, so what remains on a chrome element is exactly the interior cascade plus the
# browser's defaults, as on an interior page. SVG and its children are left out because `all:revert`
# would also discard their presentation attributes (fill, stroke, width), which interior pages keep.
# Measured 2026-11-19: without it the footer name link took the homepage's heading colour.
RESET = ("%s, %s :where(*:not(svg, svg *)){all:revert}" % (WHERE, WHERE))
# LAYERS (measured 2026-11-19). The re-targeted body and token declarations land ON the chrome roots, where
# on an interior page they only arrive by inheritance, which always loses to a root's own rule. Unlayered,
# `:root[data-theme="dark"] body :where(...)` (0,2,1) outranked `footer.sf{color:var(--sf-text)}` (0,1,1)
# and the footer took the body colour. So the reset and the base sit in layers, in this order of first
# appearance after the page's own `@layer home`: home < chrome-reset < chrome-base < unlayered chrome rules.
# Within chrome-base the base rules keep their own specificity and order, so theme blocks still decide.


class CSSError(Exception):
    pass


def repo_root():
    here = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), here):
        r = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True,
                           text=True, cwd=cwd)
        if r.returncode == 0 and os.path.isfile(os.path.join(r.stdout.strip(), PARTIALS[0])):
            return r.stdout.strip()
    return os.path.dirname(here)


# ---- a small CSS reader: comments out, strings intact, blocks nested ----------------------------

def strip_comments(css):
    out, i, n = [], 0, len(css)
    while i < n:
        c = css[i]
        if c in "\"'":
            j = i + 1
            while j < n and css[j] != c:
                j += 2 if css[j] == "\\" else 1
            out.append(css[i:j + 1])
            i = j + 1
        elif css.startswith("/*", i):
            j = css.find("*/", i + 2)
            i = n if j < 0 else j + 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def match_brace(css, i):
    depth, n = 0, len(css)
    while i < n:
        c = css[i]
        if c in "\"'":
            j = i + 1
            while j < n and css[j] != c:
                j += 2 if css[j] == "\\" else 1
            i = j
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise CSSError("unbalanced braces")


def parse(css):
    """[('rule', selector, body) | ('group', prelude, children) | ('raw', prelude, body) | ('stmt', text)]"""
    nodes, i, start, n = [], 0, 0, len(css)
    while i < n:
        c = css[i]
        if c in "\"'":
            j = i + 1
            while j < n and css[j] != c:
                j += 2 if css[j] == "\\" else 1
            i = j + 1
            continue
        if c == "{":
            prelude = css[start:i].strip()
            j = match_brace(css, i)
            body = css[i + 1:j]
            if prelude.startswith("@"):
                name = prelude[1:].split(None, 1)[0].lower() if len(prelude) > 1 else ""
                if name in CONTAINER_AT:
                    nodes.append(("group", prelude, parse(body)))
                else:
                    nodes.append(("raw", prelude, body))
            else:
                if "{" in body:
                    raise CSSError("nested CSS rule under %r is not supported" % prelude[:60])
                nodes.append(("rule", prelude, body))
            i = start = j + 1
            continue
        if c == ";" and css[start:i].strip().startswith("@"):
            nodes.append(("stmt", css[start:i + 1].strip()))
            i = start = i + 1
            continue
        if c == "}":
            raise CSSError("unbalanced braces")
        i += 1
    return nodes


def split_top(text, sep):
    parts, depth, cur, i, n = [], 0, [], 0, len(text)
    while i < n:
        c = text[i]
        if c in "\"'":
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            cur.append(text[i:j + 1])
            i = j + 1
            continue
        if c in "([":
            depth += 1
        elif c in ")]":
            depth -= 1
        if c == sep and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
        i += 1
    parts.append("".join(cur))
    return [p.strip() for p in parts if p.strip()]


def declarations(body):
    out = []
    for d in split_top(body, ";"):
        if ":" not in d:
            continue
        prop, val = d.split(":", 1)
        # one declaration per line in the stamped region: a value written across lines in the
        # source (a long gradient, a font stack) is joined, its own spacing within a line kept
        out.append((prop.strip(), re.sub(r"\s*\n\s*", " ", val.strip())))
    return out


def compounds(selector):
    """[(combinator, compound)], the first combinator being ''."""
    out, cur, comb, depth, i, n = [], [], "", 0, 0, len(selector)
    while i < n:
        c = selector[i]
        if c in "([":
            depth += 1
        elif c in ")]":
            depth -= 1
        if depth == 0 and (c.isspace() or c in ">+~"):
            if cur:
                out.append((comb, "".join(cur)))
                cur, comb = [], ""
            if c in ">+~":
                comb = c
            elif not comb:
                comb = " "
            i += 1
            continue
        cur.append(c)
        i += 1
    if cur:
        out.append((comb if out else "", "".join(cur)))
    return [(c.strip() or " " if k else "", s) for k, (c, s) in enumerate(out)]


def bare(compound):
    """The compound with functional pseudo-class arguments removed, for token reading."""
    out, depth = [], 0
    for c in compound:
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        elif depth == 0:
            out.append(c)
    return "".join(out)


def compound_tokens(compound):
    b = bare(compound)
    m = re.match(r"([a-zA-Z][\w-]*|\*)", b)
    return (m.group(1).lower() if m else ""), set(re.findall(r"\.([\w-]+)", b)), \
        set(re.findall(r"#([\w-]+)", b))


# ---- classification ---------------------------------------------------------------------------

def vocabulary(root):
    classes, ids = set(), set()
    for rel in PARTIALS:
        with open(os.path.join(root, rel), encoding="utf-8") as fh:
            html = fh.read()
        for v in re.findall(r'class="([^"]*)"', html):
            classes.update(v.split())
        ids.update(re.findall(r'id="([^"]*)"', html))
    return classes - UTILITY - NOT_CARRIED, ids


def is_chrome_compound(compound, vocab):
    typ, classes, ids = compound_tokens(compound)
    chrome_classes, chrome_ids = vocab
    if typ in ("html", "body") or compound.startswith(":root"):
        return False  # a state class on html or body is context, not chrome
    return typ in ("header", "footer") or bool(classes & chrome_classes) or bool(ids & chrome_ids)


def classify(selector, vocab):
    """'chrome' | 'root' | 'body' | 'generic' | 'utility' | None (not carried)."""
    parts = compounds(selector)
    if not parts:
        return None
    _, last = parts[-1]
    typ, classes, ids = compound_tokens(last)
    if classes & NOT_CARRIED:
        return None
    if any(compound_tokens(c)[1] & STATE for _, c in parts):
        return "chrome"
    if len(parts) == 1 and (typ == "html" or last.startswith(":root")):
        return "root"
    if typ == "body" and "::" not in last:
        return "body" if all(compound_tokens(c)[0] in ("html", "") or c.startswith(":root")
                             for _, c in parts[:-1]) else None
    # chrome: the last compound carrying chrome vocabulary is the subject or its ancestor
    idx = max((k for k, (_, c) in enumerate(parts) if is_chrome_compound(c, vocab)), default=-1)
    if idx >= 0 and all(comb in (" ", ">") for comb, _ in parts[idx + 1:]):
        return "chrome"
    if idx >= 0:
        return None  # a sibling of the chrome, not inside it
    all_tokens = [compound_tokens(c) for _, c in parts]
    if any(t[0] in ("html", "body") or c.startswith(":root") for (_, c), t in zip(parts, all_tokens)):
        return None
    if "::view-transition" in selector:
        return None  # those pseudo-elements live on the document root, never inside the chrome
    used = set().union(*(t[1] for t in all_tokens))
    if not used and not any(t[2] for t in all_tokens):
        return "generic"
    if used and used <= UTILITY and not any(t[2] for t in all_tokens):
        return "utility"
    return None


def scoped(selector):
    """The selector scoped under the chrome roots, specificity unchanged; plus a root self-form."""
    parts = compounds(selector)
    out = ["%s %s" % (WHERE, selector)]
    if len(parts) == 1:
        comp = parts[0][1]
        typ = compound_tokens(comp)[0]
        if typ in ("", "*"):
            rest = comp[1:] if comp.startswith("*") else comp
            m = re.search(r"::", rest)
            head, tail = (rest[:m.start()], rest[m.start():]) if m else (rest, "")
            out.append("%s%s%s" % (WHERE, head, tail))
    return out


def retarget(selector):
    """A root or body selector re-pointed at the chrome roots, the whole selector kept as context:
    `:root[data-theme="dark"] body` becomes `:root[data-theme="dark"] body :where(...)`, which keeps
    every condition the original had and, since :where() adds nothing, its specificity."""
    return "%s %s" % (selector, WHERE)


# ---- generation -------------------------------------------------------------------------------

def collect(nodes, vocab):
    """The carried tree: [('group', prelude, children) | ('rule', kind, selectors, decls)]."""
    items = []
    for node in nodes:
        if node[0] == "group":
            inner = collect(node[2], vocab)
            if inner:
                items.append(("group", " ".join(node[1].split()), inner))
            continue
        if node[0] != "rule":
            continue
        decls = declarations(node[2])
        by_kind = {"as-is": [], "root": [], "body": []}
        for sel in split_top(node[1], ","):
            sel = " ".join(sel.split())
            cls = classify(sel, vocab)
            if cls == "chrome":
                by_kind["as-is"].append(sel)
            elif cls in ("generic", "utility"):
                by_kind["as-is"].extend(scoped(sel))
            elif cls in ("root", "body"):
                by_kind[cls].append(retarget(sel))
        for kind, sels in by_kind.items():
            if not sels:
                continue
            if kind == "as-is":
                keep = decls
            else:
                # html's font-size sets the rem base and may be a percentage, which on a chrome
                # root would resolve against the homepage's body: only body rules carry font sizing.
                skip = {"font-size", "font"} if kind == "root" else set()
                # !important dropped: on an interior page a body or :root declaration reaches the chrome only
                # by inheritance, where its priority cannot beat a chrome element's own rule. Re-targeted onto
                # the root it would (a layered !important outranks every unlayered declaration): vault.css's
                # `body{color:var(--ink) !important}` took the footer's colour that way, measured 2026-11-19.
                keep = [(p, re.sub(r"\s*!\s*important\s*$", "", v, flags=re.I)) for p, v in decls
                        if p.startswith("--") or (p.lower() in INHERITED and p.lower() not in skip)]
            if keep:
                items.append(("rule", kind, sels, keep))
    return items


def walk(items):
    for it in items:
        if it[0] == "group":
            yield from walk(it[2])
        else:
            yield it


def needed_tokens(items):
    """Custom properties the carried rules read, closed over the token definitions they read."""
    defs, used = {}, set()
    for _, kind, _, decls in walk(items):
        for p, v in decls:
            refs = set(re.findall(r"var\(\s*(--[\w-]+)", v))
            if p.startswith("--") and kind in ("root", "body"):
                defs.setdefault(p, set()).update(refs)
            else:
                used |= refs
    todo, seen = list(used), set()
    while todo:
        t = todo.pop()
        if t in seen:
            continue
        seen.add(t)
        todo.extend(defs.get(t, ()))
    return seen


def render(items, tokens, keyframes_used, kinds, depth=0):
    out, pad = [], "  " * depth
    for it in items:
        if it[0] == "group":
            inner = render(it[2], tokens, keyframes_used, kinds, depth + 1)
            if inner:
                out.append("%s%s{" % (pad, it[1]))
                out.extend(inner)
                out.append("%s}" % pad)
            continue
        _, kind, sels, decls = it
        if kind not in kinds:
            continue
        if kind in ("root", "body"):
            decls = [(p, v) for p, v in decls if not p.startswith("--") or p in tokens]
        if not decls:
            continue
        for p, v in decls:
            if p.lower() in ("animation", "animation-name"):
                keyframes_used.update(re.findall(r"[\w-]+", v))
        out.append("%s%s{%s}" % (pad, ", ".join(sels), "; ".join("%s:%s" % (p, v) for p, v in decls)))
    return out


def keyframes_blocks(trees, names):
    found = []
    for nodes in trees:
        for node in nodes:
            if node[0] == "raw" and node[1].lower().startswith(("@keyframes", "@-webkit-keyframes")):
                name = node[1].split(None, 1)[1].strip() if " " in node[1] else ""
                if name in names:
                    found.append("%s{%s}" % (node[1], " ".join(node[2].split())))
    return found


def generate(root):
    """The region's lines (between the markers), and the source digest."""
    vocab = vocabulary(root)
    trees, digest = [], hashlib.sha256()
    for rel in SOURCES:
        with open(os.path.join(root, rel), encoding="utf-8") as fh:
            text = fh.read()
        digest.update(text.encode("utf-8"))
        trees.append(parse(strip_comments(text)))
    items = [it for nodes in trees for it in collect(nodes, vocab)]
    tokens = needed_tokens(items)
    used = set()
    base = render(items, tokens, used, {"root", "body"}, depth=1)
    rules = render(items, tokens, used, {"as-is"})
    head = ["/* source digest %s; %d base and %d chrome rules */"
            % (digest.hexdigest()[:16], len(base), len(rules)),
            "@layer chrome-reset{", "  " + RESET, "}",
            "@layer chrome-base{"] + base + ["}"]
    return head + keyframes_blocks(trees, used) + rules


START_RE = re.compile(r"^\s*/\*\s*site-chrome:css START\b")
END_RE = re.compile(r"^\s*/\*\s*site-chrome:css END\b")


def region(lines):
    s = next((i for i, l in enumerate(lines) if START_RE.match(l)), None)
    e = next((i for i, l in enumerate(lines) if s is not None and i > s and END_RE.match(l)), None)
    return (s, e) if s is not None and e is not None else None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    a = ap.parse_args()
    root = repo_root()
    try:
        generated = generate(root)
    except (OSError, CSSError) as e:
        print("render_chrome_css: ERROR %s" % e, file=sys.stderr)
        return 2
    path = os.path.join(root, TARGET)
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().split("\n")
    span = region(lines)
    if span is None:
        print("render_chrome_css: ERROR %s carries no site-chrome:css START/END markers" % TARGET,
              file=sys.stderr)
        return 2
    s, e = span
    if a.check:
        if lines[s + 1:e] == generated:
            print("render_chrome_css: OK. %s's chrome styles are in sync with %s."
                  % (TARGET, " + ".join(SOURCES)))
            return 0
        print("render_chrome_css: FAIL %s's chrome styles are out of sync with %s; run: "
              "python3 scripts/render_chrome_css.py --write" % (TARGET, " + ".join(SOURCES)))
        return 1
    lines[s + 1:e] = generated
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    print("render_chrome_css: stamped %d line(s) into %s." % (len(generated), TARGET))
    return 0


if __name__ == "__main__":
    sys.exit(main())
