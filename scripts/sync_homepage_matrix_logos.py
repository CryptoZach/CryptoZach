#!/usr/bin/env python3
"""Keep the homepage's embedded matrix logos in sync with their committed assets."""
import argparse
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def render(source):
    rows = json.loads((ROOT / "scripts/homepage_matrix_logos.json").read_text())
    names = [row["name"] for row in rows]
    if len(names) != len(set(names)) or not rows:
        raise ValueError("Logo registry must be nonempty with unique names")
    match = re.search(r"var ICONS = \[(.*?)\n  \];", source, re.S)
    wordmarks = re.search(r"var WORDMARK = \{(.*?)\};", source)
    if not match or not wordmarks:
        raise ValueError("Homepage logo delivery markers are missing")
    body = match.group(1).rstrip()
    wm = [name.strip().split(":")[0].strip().strip('"') for name in wordmarks.group(1).split(",") if name.strip()]
    for row in rows:
        name = row["name"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
            raise ValueError("Invalid logo name: " + name)
        if row["asset"] != f"icons/matrix/{name}.webp":
            raise ValueError("Logo asset must match its name under icons/matrix")
        asset = (ROOT / row["asset"]).resolve()
        if not asset.is_relative_to((ROOT / "icons/matrix").resolve()):
            raise ValueError("Logo asset escapes the matrix asset directory")
        data = asset.read_bytes()
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise ValueError("Expected WebP asset: " + str(asset))
        encoded = base64.b64encode(data).decode("ascii")
        entry = '{n:"%s",c:%d,w:%d,s:"data:image/webp;base64,%s"}' % (name, row["crypto"], row["weight"], encoded)
        pattern = r'\{n:"' + name + r'",[^}]+\}'
        matches = re.findall(pattern, body)
        if len(matches) > 1:
            raise ValueError("Duplicate embedded logo: " + name)
        if matches:
            body = re.sub(pattern, lambda _: entry, body)
        else:
            body += ",\n    " + entry
        if row["wordmark"] and name not in wm:
            wm.append(name)
        elif not row["wordmark"] and name in wm:
            wm.remove(name)
    source = source[:match.start(1)] + body + source[match.end(1):]
    return re.sub(r"var WORDMARK = \{.*?\};", "var WORDMARK = { " + ", ".join(json.dumps(name) + ":1" for name in wm) + " };", source, count=1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    page = ROOT / "index.html"
    source = page.read_text()
    expected = render(source)
    if args.write:
        if source != expected:
            page.write_text(expected)
        print("Homepage matrix logo assets embedded")
        return 0
    if source != expected:
        print("Homepage matrix logos are missing or stale. Run npm run build:homepage-logos")
        return 1
    print("Homepage matrix logo delivery matches the registry and asset bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
