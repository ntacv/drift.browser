#!/usr/bin/env node
/**
 * Interactive release helper for Drift Browser.
 *
 * Flow:
 *   1. Verify the working tree is clean and pull the default branch
 *   2. Ask for the new semantic version (or take it from argv)
 *   3. Bump package.json / package-lock.json (no tag yet)
 *   4. Sync app.json expo.version
 *   5. Commit "chore(release): prepare vX.Y.Z"
 *   6. Create annotated tag vX.Y.Z
 *   7. Push the commit and the tag -> triggers .github/workflows/release-on-tag.yml
 *
 * Usage:
 *   npm run release            # interactive prompt
 *   npm run release -- 1.4.0   # non-interactive
 */

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

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

const capture = (cmd, args = []) =>
  execSync(`${cmd}${args.length ? ' ' + args.join(' ') : ''}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

// Strip a UTF-8 BOM if present (PowerShell/Windows editors sometimes add one).
const readJson = (path) =>
  JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (path, data) =>
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');

async function main() {
  const repoRoot = capture('git', ['rev-parse', '--show-toplevel']);

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
      step(`Current version: ${current}`);
      next = (await rl.question('Enter the new version (e.g. 1.4.0): ')).trim();
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

  // --- Bump metadata --------------------------------------------------------
  step('Bumping package.json / package-lock.json');
  run('npm', ['version', next, '--no-git-tag-version', '--ignore-scripts']);

  step('Syncing app.json expo.version');
  const app = readJson(appPath);
  app.expo.version = next;
  writeJson(appPath, app);
  log(`  app.json expo.version -> ${next}`);

  // --- Commit + tag ---------------------------------------------------------
  step('Committing version bump');
  run('git', ['add', 'package.json', 'package-lock.json', 'app.json']);
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
