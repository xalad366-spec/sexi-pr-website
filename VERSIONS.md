# sexí — versions

The current state of `main` is **v1.0** — the final light-only product.

## Tag conventions

| Tag                              | What it points to                              | Notes |
| -------------------------------- | ---------------------------------------------- | ----- |
| `v1.0`                           | The official v1.0 release of the live site     | Light mode only, final product, this is what's deployed at sexi-pr.pages.dev |
| `v1.0-dark`                      | The prototype-phase snapshot (dark default + theme toggle + locked variant) | Same content as `archive/dark-final-2026-04-28`, just renamed in the v1.x family |
| `archive/dark-final-2026-04-28`  | Same as `v1.0-dark`                            | Historical name, kept for reference |

## Future versions

| What changes                                | Bump to |
| ------------------------------------------- | ------- |
| Tiny tweaks (typo, padding, color of one element) | `v1.0.1`, `v1.0.2` … |
| New copy / new product / non-structural changes   | `v1.1`, `v1.2` … |
| Big redesign / architectural shift                | `v2.0` |

Tags are created via `git tag -a vX.Y -m "..."` and pushed with
`git push origin vX.Y`. The deploy pipeline doesn't care about tags — every
push to `main` auto-deploys to Cloudflare Pages. Tags are just labels for
"this commit is v1.0" so we can return to it any time.

## Restoring a previous version

```bash
# View files at a specific tag (read-only):
git checkout v1.0-dark

# Restore main to a specific tag (destructive, only do if you know):
git reset --hard v1.0
```

Or browse on GitHub:
github.com/xalad366-spec/sexi-pr-website/tree/v1.0-dark
