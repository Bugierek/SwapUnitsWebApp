# SwapUnits — deploy & branching notes

Specific to Bugierek/SwapUnitsWebApp's own deployment (domains, Firebase project, this machine's local VS Code settings). This repo is public and forkable - if you forked it, this file describes the original owner's setup, not yours.

## Branches and domains

- `dev` → deploys to **unitswap.xyz**
- `master` → deploys to **swapunits.com** (production)

This is the correct mapping — treat it as reliable. (A 2026-08-13 session briefly concluded both domains deploy from `master`, based on seeing unitswap.xyz redeploy right after a `master`-only push. That was wrong: `dev` had actually also been pushed to `origin/dev` around the same time via VS Code's Source Control "Sync Changes," not via any explicit `git push` command — see the gotcha below. Once that's accounted for, the simple one-branch-per-domain mapping fully explains what was observed, with no need for a shared-branch/multiple-backend theory.)

Firebase App Hosting (`apphosting.yaml`, Cloud Run) — not Vercel, no GitHub Actions workflow. Firebase watches each branch and auto-builds/deploys on push. Pushing `origin/master` redeploys production (swapunits.com) only.

## Gotcha: VS Code can push without anyone running `git push`

This machine's global VS Code settings have `git.confirmSync: false`. That means the Source Control panel's "Sync Changes" button pushes (and pulls) **with no confirmation prompt**, and it does so entirely inside the editor UI — invisible to anything that only checks terminal/Bash command history. Don't conclude "I never pushed branch X" just because you can't find a `git push` command for it — check `git log origin/<branch> -1` directly instead. This is likely what pushed `dev` to `origin/dev` during the 2026-08-13 session even though no explicit push command for it was ever run.

## apphosting.yaml domain switching

`apphosting.yaml`'s committed `NEXT_PUBLIC_SITE_URL` differs between the `dev` and `master` branches (`unitswap.xyz` vs `swapunits.com`) in the git history, and two git hooks (`.husky/post-checkout`, `.husky/post-merge`, wired via `git config core.hooksPath=.husky`) auto-correct that value to match whichever branch you're on, every time you checkout or merge. That mechanism works correctly for **local `git merge`** — verified directly on 2026-08-13 (hook fired, file content checked after). It does **not** fire for GitHub-UI/`gh pr merge` merges, since those happen server-side with no local hook involved — the one PR merge in this repo's history (`66e41ac`, "Merge pull request #1 from Bugierek/deployUnitswapXyz") is exactly that case, and is why a past session found the hook "broken" and started manually pre-correcting the domain on a branch before merging instead.

Keep using `git merge` locally (not a GitHub PR button) when merging into `master` — the hook is a real, working safety net for this value, confirmed working on 2026-08-13.

## Merging dev → master

```
git checkout master
git merge dev
# resolve the apphosting.yaml conflict (if any) by keeping master's swapunits.com value —
# post-merge hook will also force it back to swapunits.com regardless
git push origin master
```

Pushing to `master` deploys to production immediately — always confirm with the user before pushing, even if the merge itself is already staged locally.

## Why two domains exist

swapunits.com is the current primary brand; unitswap.xyz is the original domain, still used as the Resend "from" address for transactional email since swapunits.com isn't yet a verified Resend sending domain (see commit `a3e14eb`).
