# Git Commit and Version Tag Workflow

This workflow keeps feature history easy to read and makes releases traceable.

## Goals

- Make commits understandable at a glance
- Keep one feature per commit when possible
- Use semantic version tags (`vX.Y.Z`)
- Auto-publish GitHub Releases from tags

## 1) Branching

- Branch from `main`
- Branch naming:
  - `feat/<short-topic>`
  - `fix/<short-topic>`
  - `docs/<short-topic>`
  - `refactor/<short-topic>`

Examples:

- `feat/left-hand-mode`
- `fix/url-overlay-back-action`

## 2) Commit Message Convention

Use Conventional Commits style:

```text
<type>(optional-scope): <short summary>
```

Types used in this repo:

- `feat`: New user-facing feature
- `fix`: Bug fix
- `refactor`: Internal code change without behavior change
- `docs`: Documentation changes
- `chore`: Tooling/maintenance

Examples:

```text
feat(menu): add tile reorder mode
fix(urlbar): close overlay on android back action
docs(readme): add user guide and settings details
```

## 3) Commit Granularity

Recommended:

- 1 commit per coherent feature change
- Avoid mixing unrelated updates in a single commit
- Keep formatting-only changes separate when possible

## 4) Versioning Rules (SemVer)

- `vMAJOR.MINOR.PATCH`
- PATCH: bug fix or small compatible improvement
- MINOR: new backward-compatible feature
- MAJOR: breaking behavior/API change

Examples:

- `v1.4.3` -> patch
- `v1.5.0` -> minor
- `v2.0.0` -> major

## 5) Release Flow

### A) Prepare and merge

1. Create feature/fix branch
2. Commit with conventional messages
3. Open PR and merge to `main`

### B) Create a version tag

From local clone on `main`:

1. Bump version metadata first (example `1.1.0`):

```bash
npm version 1.1.0 --no-git-tag-version
```

2. Commit version bump:

```bash
git add package.json package-lock.json app.json
git commit -m "chore(release): prepare v1.1.0"
```

3. Create and push the tag:

```bash
git pull origin main
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### C) Automatic GitHub Release

Pushing tag `v*` triggers:

- `.github/workflows/release-on-tag.yml`
- EAS Android and iOS production builds
- GitHub Release creation
- Upload of packaged artifacts (`.apk` and `.ipa`) to that release
- Auto-generated release notes from merged PRs/commits

Required repository secret:

- `EXPO_TOKEN` (used by EAS in GitHub Actions)

## 6) Suggested Feature History Pattern

For one feature, prefer sequence like:

```text
feat(settings): add tab list size option
feat(tab-tray): support expanded full-height layout
fix(tab-tray): preserve tray while switching workspace
docs(readme): document tab tray behavior
```

This gives clean traceability from feature to release tag.

## 7) Optional Local Checklist Before Tagging

```bash
npm install
npx tsc --noEmit
```

If checks pass, create and push tag.
