const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/hooks/siteShortcut.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsForTest, URL, Date });
const { shortcutUrl, createShortcutQueue } = exportsForTest;
const link = (url) => `drift://open?url=${encodeURIComponent(url)}`;

test('shortcuts accept only validated HTTP(S) targets and preserve OAuth routing', () => {
  assert.equal(shortcutUrl(link('https://example.com/path?q=1#part')), 'https://example.com/path?q=1#part');
  for (const input of [link('javascript:alert(1)'), link('file:///secret'), link('https://user:pass@example.com'), link('https://example.com/\n'), 'drift://fxa-oauth?code=abc', 'drift://open/other?url=https://example.com', 'https://open?url=https://example.com', link('https://example.com') + '&url=https://other.com']) {
    assert.equal(shortcutUrl(input), null, input);
  }
});

test('cold launches wait for hydration and duplicate deliveries open one tab', () => {
  let time = 0;
  const opened = [];
  const queue = createShortcutQueue((url) => opened.push(url), () => time);
  queue.accept(link('https://example.com'));
  queue.accept(link('https://example.com'));
  assert.equal(opened.length, 0);
  queue.ready();
  assert.deepEqual(opened, ['https://example.com/']);
  queue.accept(link('https://example.com'));
  assert.equal(opened.length, 1);
  time = 2000;
  queue.accept(link('https://example.com'));
  assert.equal(opened.length, 2);
  queue.accept(link('https://other.com'));
  assert.equal(opened.length, 3);
});
