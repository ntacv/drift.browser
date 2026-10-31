const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(output, {
    exports, URL, console,
    require: (name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.ts`)), mocks);
      return require(name);
    },
  }, { filename });
  return exports;
}

const { APP_LINK_DOMAINS, getExternalLink, safeWebUrl, isWebViewUrl } = load('src\\hooks\\externalLinks.ts');

test('recognizes common app links, language subdomains, and official share links', () => {
  const examples = [
    'https://en.m.wikipedia.org/wiki/Browser',
    'https://www.instagram.com/p/example/', 'https://www.facebook.com/share/example',
    'https://fb.watch/example/', 'https://m.me/example', 'https://www.threads.com/@example',
    'https://www.threads.net/@example', 'https://x.com/example/status/123',
    'https://twitter.com/example/status/123', 'https://vm.tiktok.com/example/',
    'https://www.snapchat.com/add/example', 'https://pin.it/example',
    'https://www.linkedin.com/in/example', 'https://bsky.app/profile/example.bsky.social',
    'https://example.tumblr.com/post/123', 'https://wa.me/123456789',
    'https://chat.whatsapp.com/example', 'https://t.me/example',
    'https://signal.me/#example', 'https://signal.group/#example', 'https://discord.gg/example',
    'https://open.spotify.com/track/example', 'https://spotify.link/example',
    'https://music.apple.com/us/album/example', 'https://on.soundcloud.com/example',
    'https://www.twitch.tv/example', 'https://www.netflix.com/title/123',
    'https://example.zoom.us/j/123', 'https://teams.microsoft.com/l/meetup-join/example',
    'https://teams.live.com/meet/123', 'https://example.slack.com/archives/example',
    'https://maps.google.com/?q=Paris', 'https://maps.app.goo.gl/example',
    'https://www.google.com/maps/search/?api=1&query=Paris', 'https://goo.gl/maps/example',
    'https://www.waze.com/ul?ll=48.85,2.35',
  ];
  for (const url of examples) {
    assert.equal(getExternalLink(url)?.url, url, url);
    assert.equal(getExternalLink(url)?.fallbackUrl, new URL(url).href, url);
  }
});

test('every registered domain matches with a hostname boundary, never lookalikes', () => {
  assert.equal(Object.keys(APP_LINK_DOMAINS).length, 29);
  for (const domain of Object.values(APP_LINK_DOMAINS).flat()) {
    for (const host of [domain, `www.${domain}`, domain.toUpperCase()]) {
      const url = `https://${host}/example`;
      assert.equal(getExternalLink(url)?.url, url, url);
    }
    for (const host of [`${domain}.example.org`, `not-${domain}`]) {
      assert.equal(getExternalLink(`https://${host}/example`), null, host);
    }
  }
});

test('shared providers, general shorteners, and unrelated web URLs do not trigger app prompts', () => {
  for (const url of [
    'https://www.google.com/search?q=wikipedia', 'https://www.google.com/maps-not-an-app',
    'https://goo.gl/example', 'https://example.app.goo.gl/example',
    'https://apple.com', 'https://support.apple.com', 'https://microsoft.com',
    'https://t.co/example', 'https://bit.ly/example', 'https://example.org/?next=https://instagram.com',
  ]) assert.equal(getExternalLink(url), null, url);
});

test('recognizes custom schemes and supported HTTPS app domains without lookalike matches', () => {
  for (const url of ['reddit://post/123', 'github://repo', 'vnd.youtube:video', 'mailto:test@example.com', 'https://www.reddit.com/r/test', 'https://github.com/org/repo', 'https://m.youtube.com/watch?v=123', 'https://youtu.be/123']) {
    assert.equal(getExternalLink(url).url, url);
  }
  for (const url of ['https://example.com', 'https://github.com.evil.test', 'https://notreddit.com', 'javascript:alert(1)', 'about:blank', 'data:text/html,test', 'blob:https://example.com/id', 'file:///test']) {
    assert.equal(getExternalLink(url), null);
  }
  assert.equal(isWebViewUrl('intent://watch#Intent;scheme=youtube;end'), false);
});

test('accepts only safe HTTP(S) intent fallbacks and tolerates malformed encodings', () => {
  const intent = (fallback) => `intent://watch#Intent;scheme=youtube;S.browser_fallback_url=${fallback};end`;
  assert.equal(getExternalLink(intent(encodeURIComponent('https://youtube.com/watch?v=1'))).fallbackUrl, 'https://youtube.com/watch?v=1');
  for (const value of ['javascript:alert(1)', 'file:///secret', 'https://user:pass@example.com', 'intent://nested', '//example.com']) {
    assert.equal(getExternalLink(intent(encodeURIComponent(value))).fallbackUrl, null);
    assert.equal(safeWebUrl(value), null);
  }
  assert.equal(getExternalLink(intent('%ZZ')).fallbackUrl, null);
  assert.equal(getExternalLink('intent://broken').fallbackUrl, null);
});

function hookHarness(action = 'ask', launcher = async () => {}) {
  const slots = [];
  let index = 0;
  const updates = [];
  const launches = [];
  const state = {
    tabs: { 'tab-1': { url: 'https://example.com' } },
    externalLinkAction: action,
    setExternalLinkAction(value) { this.externalLinkAction = value; },
    updateTabMeta(id, patch) { updates.push({ id, patch }); },
  };
  const react = {
    useRef(value) { const i = index++; return slots[i] ?? (slots[i] = { current: value }); },
    useState(value) { const i = index++; if (!(i in slots)) slots[i] = value; return [slots[i], (next) => { slots[i] = next; }]; },
    useCallback(callback) { return callback; },
    useEffect() {},
  };
  const { useExternalLinks } = load('src\\hooks\\useExternalLinks.ts', {
    react,
    'react-native': { Platform: { OS: 'android' }, NativeModules: { ExternalLinks: { open: async (url) => { launches.push(url); await launcher(url); } } } },
    '../store/browserStore': { useBrowserStore: { getState: () => state } },
  });
  return { state, updates, launches, render(visible = true) { index = 0; return useExternalLinks('tab-1', visible); } };
}

test('asks before opening, deduplicates requests, and remembers a successful external choice', async () => {
  const h = hookHarness();
  assert.equal(h.render().request('reddit://post/1'), true);
  assert.equal(h.launches.length, 0);
  assert.equal(h.render().pending.url, 'reddit://post/1');
  h.render().request('reddit://post/2');
  assert.equal(h.render().pending.url, 'reddit://post/1');
  await h.render().choose('external', true);
  assert.deepEqual(h.launches, ['reddit://post/1']);
  assert.equal(h.state.externalLinkAction, 'external');
  assert.equal(h.render().pending, null);
});

test('stay loads web fallback in the originating tab without prompting again', async () => {
  const h = hookHarness();
  const url = 'intent://post/1#Intent;scheme=reddit;S.browser_fallback_url=https%3A%2F%2Freddit.com%2Fr%2Ftest;end';
  h.render().request(url);
  await h.render().choose('stay', true);
  assert.equal(h.state.externalLinkAction, 'stay');
  assert.equal(h.updates.at(-1).id, 'tab-1');
  assert.equal(h.updates.at(-1).patch.url, 'https://reddit.com/r/test');
  assert.equal(h.render().request('https://reddit.com/r/test'), false);
  assert.equal(h.render().request(url), true);
  assert.equal(h.launches.length, 0);
});

test('remembered stay leaves custom links without fallbacks on the current page', () => {
  const h = hookHarness('stay');
  assert.equal(h.render().request('github://repo'), true);
  assert.ok(h.updates.every(({ patch }) => !('url' in patch)));
  assert.equal(h.render().pending, null);
  assert.equal(h.render().request('https://github.com/org/repo'), false);
  assert.equal(h.launches.length, 0);
});

test('failed launches remain actionable and never save a failed remembered choice', async () => {
  const h = hookHarness('ask', async () => { throw new Error('App not installed'); });
  h.render().request('https://youtube.com/watch?v=1');
  await h.render().choose('external', true);
  assert.equal(h.state.externalLinkAction, 'ask');
  assert.equal(h.render().failed, true);
  assert.equal(h.render().opening, false);
  assert.ok(h.render().pending);
  await h.render().choose('stay', false);
  assert.equal(h.updates.at(-1).patch.url, 'https://youtube.com/watch?v=1');
  assert.equal(h.render().pending, null);
});

test('remembered external launches automatically but failures show the sheet', async () => {
  const h = hookHarness('external', async () => { throw new Error('No handler'); });
  h.render().request('reddit://post/1');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.launches.length, 1);
  assert.equal(h.render().failed, true);
  assert.ok(h.render().pending);
});

test('hidden tabs cannot launch apps and dismissal does not save a preference', () => {
  const h = hookHarness();
  assert.equal(h.render(false).request('reddit://post/1'), true);
  assert.equal(h.render().pending, null);
  h.render().request('github://repo');
  h.render().dismiss();
  assert.equal(h.render().pending, null);
  assert.equal(h.state.externalLinkAction, 'ask');
  assert.equal(h.launches.length, 0);
});
