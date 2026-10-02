#!/usr/bin/env node
/**
 * Interactive release helper for Drift Browser.
 *
 * Flow:
 *   1. Verify the working tree is clean and pull the default branch
 *   2. Ask for the new semantic version (or take it from argv)
 *   3. Generate release notes from conventional commit messages since the last tag
 *   4. Bump package.json / package-lock.json (no tag yet)
 *   5. Sync app.json expo.version
 *   6. Commit version bump + release notes
 *   7. Create annotated tag vX.Y.Z
 *   8. Push the commit and the tag -> triggers .github/workflows/release-on-tag.yml
 *
 * Usage:
 *   npm run release            # interactive prompt
 *   npm run release -- 1.4.0   # non-interactive
 */

import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// Default used when the prompt is answered with an empty line: next patch version.
const suggestNextVersion = (version) => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return version;
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
};

const log = (msg) => console.log(msg);
const step = (msg) => console.log(`\n\u2192 ${msg}`);
const fail = (msg) => {
  console.error(`\n\u2716 ${msg}`);
  process.exit(1);
};

// On Windows `npm` is a `.cmd` shim. Node refuses to spawn `.cmd` files directly
// (EINVAL, CVE-2024-27980), and passing args with `shell: true` triggers DEP0190,
// so build the command string ourselves. `git` is a real .exe and spawns directly.
// Only the validated SemVer string ever reaches this shell.
const isWindows = process.platform === 'win32';

const run = (cmd, args = []) => {
  log(`  $ ${cmd}${args.length ? ' ' + args.join(' ') : ''}`);
  if (cmd === 'npm' && isWindows) {
    execSync(`npm ${args.join(' ')}`, { stdio: 'inherit' });
    return;
  }
  execFileSync(cmd, args, { stdio: 'inherit' });
};

// `git` is a real .exe, so it can be spawned without a shell. Using execFileSync
// (instead of a shell string) keeps characters like `%` in format strings intact.
const capture = (cmd, args = []) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

// Strip a UTF-8 BOM if present (PowerShell/Windows editors sometimes add one).
const readJson = (path) =>
  JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (path, data) =>
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');

// --- Release notes ----------------------------------------------------------

const CONVENTIONAL_RE =
  /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s*(?<subject>.+)$/;

const CATEGORIES = [
  { key: 'feat', title: '✨ Features' },
  { key: 'fix', title: '🐛 Bug Fixes' },
  { key: 'perf', title: '⚡ Performance' },
  { key: 'refactor', title: '♻️ Refactoring' },
  { key: 'style', title: '💄 Style' },
  { key: 'test', title: '✅ Tests' },
  { key: 'docs', title: '📝 Documentation' },
  { key: 'build', title: '🏗️ Build & CI' },
  { key: 'chore', title: '🔧 Chores' },
  { key: 'revert', title: '⏪ Reverts' },
];

const repoUrl = () => {
  try {
    let url = capture('git', ['remote', 'get-url', 'origin']);
    url = url.replace(/\.git$/, '').replace(/\/$/, '');
    if (url.startsWith('git@')) {
      url = 'https://' + url.replace(/^git@/, '').replace(':', '/');
    }
    return url;
  } catch {
    return '';
  }
};

// Most recent tag reachable from HEAD (the release tag does not exist yet).
const findPreviousTag = () => {
  try {
    return capture('git', ['describe', '--tags', '--abbrev=0', 'HEAD']);
  } catch {
    return null;
  }
};

const collectCommits = (range) => {
  const out = capture('git', ['log', range, '--pretty=format:%H%x1e%s']);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf('\x1e');
      return { hash: line.slice(0, idx), subject: line.slice(idx + 1) };
    });
};

const linkPr = (url, subject) =>
  subject.replace(
    /\s*\(#(\d+)\)\s*$/,
    url ? ` [#$1](${url}/pull/$1)` : ` #$1`
  );

const buildReleaseNotes = (prevTag, tag) => {
  const url = repoUrl();
  const commits = collectCommits(prevTag ? `${prevTag}..HEAD` : 'HEAD');

  const buckets = new Map();
  for (const c of commits) {
    const match = c.subject.match(CONVENTIONAL_RE);
    let type = match ? match.groups.type.toLowerCase() : 'other';
    if (type === 'ci') type = 'build';
    const subject = match ? match.groups.subject : c.subject;
    if (!buckets.has(type)) buckets.set(type, []);
    buckets.get(type).push({ hash: c.hash, subject: linkPr(url, subject) });
  }

  const sha = (hash) =>
    url ? `[\`${hash.slice(0, 7)}\`](${url}/commit/${hash})` : `\`${hash.slice(0, 7)}\``;

  const lines = [`# ${tag}`, ''];

  if (commits.length === 0) {
    lines.push('_No changes recorded since the previous release._', '');
  }

  for (const cat of CATEGORIES) {
    const items = buckets.get(cat.key);
    if (!items) continue;
    buckets.delete(cat.key);
    lines.push(`## ${cat.title}`, '');
    for (const it of items) lines.push(`- ${it.subject} (${sha(it.hash)})`);
    lines.push('');
  }

  // Catch-all for non-conventional subjects.
  const other = buckets.get('other');
  if (other) {
    buckets.delete('other');
    lines.push('## Other Changes', '');
    for (const it of other) lines.push(`- ${it.subject} (${sha(it.hash)})`);
    lines.push('');
  }

  // Safety net for anything not mapped above.
  for (const [type, items] of buckets) {
    lines.push(`## ${type}`, '');
    for (const it of items) lines.push(`- ${it.subject}`);
    lines.push('');
  }

  if (url && prevTag) {
    lines.push(
      `**Full Changelog:** [\`${prevTag}...${tag}\`](${url}/compare/${prevTag}...${tag})`
    );
  }

  return lines.join('\n').trimEnd() + '\n';
};

async function main() {
  const repoRoot = capture('git', ['rev-parse', '--show-toplevel']);
  process.chdir(repoRoot);

  // --- Preflight ------------------------------------------------------------
  step('Checking git state');
  const dirty = capture('git', ['status', '--porcelain']);
  if (dirty) {
    fail(
      'Working tree is not clean. Commit or stash these before releasing:\n' +
        dirty
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n')
    );
  }

  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  log(`  Branch: ${branch}`);
  if (branch !== 'main') {
    log(`  ! You are not on "main". Tagging from "${branch}" is allowed but unusual.`);
  }

  step('Pulling latest changes');
  let upstream = '';
  try {
    upstream = capture('git', [
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      '@{u}',
    ]);
  } catch {
    upstream = '';
  }
  if (upstream) {
    log(`  Upstream: ${upstream}`);
    run('git', ['pull', '--ff-only']);
  } else {
    log(`  ! No upstream branch configured for "${branch}"; skipping pull.`);
  }

  // --- Version --------------------------------------------------------------
  const pkgPath = `${repoRoot}/package.json`;
  const appPath = `${repoRoot}/app.json`;
  const pkg = readJson(pkgPath);
  const current = pkg.version;

  let next = process.argv[2];
  const rl = createInterface({ input, output });
  try {
    if (!next) {
      const suggested = suggestNextVersion(current);
      step(`Current version: ${current}`);
      const answer = (
        await rl.question(
          `Enter the new version (e.g. ${suggested}, Enter to accept): `
        )
      ).trim();
      if (answer) {
        next = answer;
      } else {
        next = suggested;
        log(`  No input; using suggested version ${suggested}.`);
      }
    }
  } finally {
    rl.close();
  }

  next = next.replace(/^v/, '');

  if (!SEMVER_RE.test(next)) {
    fail(`"${next}" is not a valid semantic version (expected MAJOR.MINOR.PATCH).`);
  }
  if (next === current) {
    fail(`Version is already ${current}. Nothing to release.`);
  }

  const tag = `v${next}`;
  const existing = capture('git', ['tag', '--list', tag]);
  if (existing) {
    fail(`Tag ${tag} already exists.`);
  }

  log(`\n  ${current}  ->  ${next}  (tag ${tag})`);

  // --- Release notes --------------------------------------------------------
  // Generate BEFORE the version-bump commit so the release commit itself is
  // excluded from the notes.
  const prevTag = findPreviousTag();
  step('Generating release notes from commit messages');
  const notes = buildReleaseNotes(prevTag, tag);
  const notesDir = `${repoRoot}/docs/releases`;
  const notesRel = `docs/releases/${tag}.md`;
  mkdirSync(notesDir, { recursive: true });
  writeFileSync(`${notesDir}/${tag}.md`, notes, 'utf8');
  log(`  Wrote ${notesRel} (from ${prevTag ?? 'the first commit'})`);

  // --- Bump metadata --------------------------------------------------------
  step('Bumping package.json / package-lock.json');
  run('npm', ['version', next, '--no-git-tag-version', '--ignore-scripts']);

  step('Syncing app.json expo.version');
  const app = readJson(appPath);
  app.expo.version = next;
  writeJson(appPath, app);
  log(`  app.json expo.version -> ${next}`);

  // --- Commit + tag ---------------------------------------------------------
  step('Committing version bump and release notes');
  run('git', [
    'add',
    'package.json',
    'package-lock.json',
    'app.json',
    notesRel,
  ]);
  run('git', ['commit', '-m', `chore(release): prepare ${tag}`]);

  step(`Creating annotated tag ${tag}`);
  run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);

  const created = capture('git', ['tag', '--list', tag]);
  if (!created) {
    fail(`Tag ${tag} was not created.`);
  }
  const taggedCommit = capture('git', ['rev-list', '-n', '1', tag]);
  const head = capture('git', ['rev-parse', 'HEAD']);
  if (taggedCommit !== head) {
    fail(`Tag ${tag} does not point at HEAD.`);
  }
  log(`  ${tag} -> ${taggedCommit.slice(0, 7)}`);

  // --- Push -----------------------------------------------------------------
  step('Pushing commit and tag');
  run('git', ['push', 'origin', branch]);
  run('git', ['push', 'origin', tag]);

  log(`\n\u2714 Released ${tag}.`);
  log('  The "Release On Tag" workflow will now build and publish the GitHub Release.');
}

main().catch((err) => fail(err.message));
