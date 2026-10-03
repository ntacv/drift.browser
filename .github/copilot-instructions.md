# Repository Instructions

## Git history: never merge, always rebase

- **Never create merge commits.** Do not run `git merge` to integrate branches.
- Update a branch against `main` with `git rebase main` or `git pull --rebase`.
- Integrate work into `main` with a fast-forward or rebase. When using pull
  requests, choose **Rebase and merge** (or squash) — never a merge commit.
- Never merge a release or tooling branch into `main`.
- Rationale: `main` must stay linear so the release workflow
  (`.github/workflows/release-on-tag.yml`) and `scripts/release.mjs` keep
  producing clean, one-entry-per-change release notes.

See `docs/GIT_VERSIONING_WORKFLOW.md` for the full workflow.
