# sexí — versions

The current state of `main` is **v1.1** — color variants release (light-only product, Color option added to Tainas tee).

v1.0 is the previous tagged release before color variants.

## Tag conventions

| Tag                              | What it points to                              | Notes |
| -------------------------------- | ---------------------------------------------- | ----- |
| `v1.1`                           | Color variants release                         | Tainas tee gets Color (Black/White/Cream) — 12 variants. shared.js + modal support 2D variant lookup. Cart-line identity now includes color. |
| `v1.0`                           | First official release of the live site        | Light mode only, single-variant product modal. Last commit before color variants landed. |
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
