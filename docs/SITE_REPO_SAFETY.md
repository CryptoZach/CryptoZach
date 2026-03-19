# Site repo safety

The live site (www.cryptozach.com) is served from **CryptoZach/CryptoZach**. This repo has two remotes. Pushing to the wrong one or force-pushing overwrote the site once; these rules and scripts help prevent that.

## Remotes

| Remote | Repo | Use |
|--------|------|-----|
| **origin** | https://github.com/CryptoZach/CryptoZach | Live site. Use for normal updates. |
| **publications** | https://github.com/Research-Publications-and-Data/meshnet-depin-simulation | Reference only (DePIN simulation). Do not push site content here. Push URL is disabled. If you clone and publications has a real push URL, run: `git remote set-url --push publications no-push`. |

## Safe update command

To update the live site:

```bash
git push origin main
```

Do not use `--force` or `--force-with-lease` when pushing to `origin`. The pre-push hook blocks force-pushes to `origin` unless you set `ALLOW_FORCE_PUSH_ORIGIN=1`. After cloning, install the hook: `./scripts/install-pre-push-hook.sh`.

## Never do

- Force-push to `origin` (unless you have a clear revert plan and use the override).
- Push this workspace to `publications` (site does not belong there).
- Use a clone that was created from meshnet-depin-simulation as the source for pushing to the live site. For site edits, work in a clone created from **CryptoZach/CryptoZach**.

## Backup clone

To keep a known-good copy of the site repo (for comparison or recovery), run from this repo root:

```bash
./scripts/clone-site-backup.sh
```

This clones (or pulls) CryptoZach/CryptoZach into a sibling directory. It does not push. Run it periodically, e.g. before big changes or weekly.

## Safe push script

To push only when `origin` is definitely CryptoZach/CryptoZach:

```bash
./scripts/safe-push-site.sh
```

Exits with an error and a reminder if `origin` points elsewhere.

## Tagging before major updates

Before large or risky changes, create a tag so you have a revert point:

```bash
git tag site/pre-deploy-$(date +%Y-%m-%d)
git push origin site/pre-deploy-$(date +%Y-%m-%d)
```

To revert later (only if you are sure and need to force-push): `git reset --hard site/pre-deploy-YYYY-MM-DD`, then use `ALLOW_FORCE_PUSH_ORIGIN=1 git push origin main --force-with-lease`.

## More detail

- [RESTORE_SITE_TO_CRYPTOZACH.md](RESTORE_SITE_TO_CRYPTOZACH.md): How to restore the live site from this workspace and where GitHub Pages is configured.
- [ROOT_CAUSE_BROKEN_LINKS.md](ROOT_CAUSE_BROKEN_LINKS.md): What broke and why (wrong remote, force push, missing assets).
