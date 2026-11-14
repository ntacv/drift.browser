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

## GitHub releases: always publish as pre-releases

- Always create or update GitHub Releases as **pre-releases**, including releases
  with plain semantic version tags such as `v1.3.6`.
- With the GitHub API, set `prerelease: true`. With GitHub CLI, use
  `gh release create --prerelease` or `gh release edit --prerelease`.
- Do not mark a release as stable or latest. Keep the pre-release flag enabled
  when updating release notes or uploading build artifacts.
- When creating or modifying release automation, explicitly configure it to
  publish pre-releases (for `softprops/action-gh-release`, set `prerelease: true`).
- Before reporting a release as complete, verify that GitHub marks it as a
  pre-release.

See `docs/GIT_VERSIONING_WORKFLOW.md` for the full workflow.
