const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loader(storage) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const req = (id) => {
      if (id === '@react-native-async-storage/async-storage') return storage;
      if (id === '@expo/vector-icons') return { MaterialIcons: { glyphMap: { home: 1, work: 2, science: 3 } } };
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
      return require(id);
    };
    vm.runInThisContext('(function(require,module,exports){' + js + '\n})', { filename: file })(req, mod, mod.exports);
    return mod.exports;
  }
  return load;
}

function memoryStorage() {
  let saved = null;
  const writes = [];
  return {
    writes,
    getItem: async () => saved,
    setItem: async (_, value) => { saved = value; writes.push(value); },
    removeItem: async () => { saved = null; },
    seed: (value) => { saved = JSON.stringify(value); },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
const activeId = (store) => store.getState().workspaces[store.getState().activeWorkspaceId].activeTabId;

async function openStore(storage) {
  const store = loader(storage)('src/store/browserStore.ts').useBrowserStore;
  await store.persist.rehydrate();
  return store;
}

test('runtime-only and unchanged updates do not serialize/write durable state', async () => {
  const storage = memoryStorage();
  const store = await openStore(storage);
  const id = activeId(store);
  for (let i = 0; i < 20; i++) store.getState().updateTabMeta(id, { scrollY: i, isLoading: true });
  for (let i = 0; i < 20; i++) store.getState().updateTabMeta(id, { scrollY: 19 });
  await settle();
  assert.equal(storage.writes.length, 0);
  store.getState().updateTabMeta(id, { title: 'Saved title', url: 'https://example.com' });
  await settle();
  assert.equal(storage.writes.length, 1);
  const saved = JSON.parse(storage.writes[0]).state.tabs[id];
  assert.equal(saved.title, 'Saved title');
  for (const key of ['scrollY', 'isLoading', 'pendingNavAction', 'webContentFullscreen', 'canGoBack']) {
    assert.equal(Object.hasOwn(saved, key), false, key);
  }
});

test('same-version restart resets all runtime fields while retaining durable state', async () => {
  const storage = memoryStorage();
  const store = await openStore(storage);
  const id = activeId(store);
  store.getState().updateTabMeta(id, { title: 'Keep me', isPinned: true });
  await settle();
  const saved = JSON.parse(storage.writes.at(-1));
  Object.assign(saved.state.tabs[id], {
    webContentFullscreen: true, themeColor: '#ffffff', webError: { code: 'oops' },
    canGoBack: true, canGoForward: true, isLoading: true, pendingNavAction: 'back',
    pendingNavActionId: 22, scrollY: 42, hasVideo: true, pictureInPictureRequestId: 2,
  });
  storage.seed(saved);
  const restored = await openStore(storage);
  const tab = restored.getState().tabs[id];
  const defaults = loader(storage)('src/store/browserPersistence.ts').TAB_RUNTIME_DEFAULTS;
  for (const [key, value] of Object.entries(defaults)) assert.equal(tab[key], value, key);
  assert.equal(tab.title, 'Keep me');
  assert.equal(tab.isPinned, true);
});

test('legacy migration and ordered durable changes survive a restart', async () => {
  const storage = memoryStorage();
  const store = await openStore(storage);
  store.getState().setLanguage('fr');
  store.getState().setLanguage('en');
  store.getState().createTab(undefined, 'https://example.org');
  await settle();
  const saved = JSON.parse(storage.writes.at(-1));
  saved.version = 6;
  storage.seed(saved);
  const restored = await openStore(storage);
  assert.equal(restored.getState().language, 'en');
  assert.equal(restored.getState().tabs[activeId(restored)].url, 'https://example.org');
});

test('failed removal reports its error without blocking queued reads, writes or removals', async () => {
  const backend = memoryStorage();
  const originalError = new Error('Storage temporarily unavailable');
  let failRemoval = true;
  const storage = loader()('src/store/browserPersistence.ts').createBrowserStorage({
    ...backend,
    removeItem: async (name) => {
      if (failRemoval) {
        failRemoval = false;
        throw originalError;
      }
      return backend.removeItem(name);
    },
  });
  const initial = { version: 7, state: { language: 'en' } };
  backend.seed(initial);
  const failedRemoval = storage.removeItem('browser');
  const read = storage.getItem('browser');
  await assert.rejects(failedRemoval, (error) => error === originalError);
  assert.deepEqual(await read, initial);

  failRemoval = true;
  const nextFailure = storage.removeItem('browser');
  const next = { version: 7, state: { language: 'fr' } };
  const write = storage.setItem('browser', next);
  await assert.rejects(nextFailure, (error) => error === originalError);
  await write;
  assert.equal(backend.writes.length, 1);
  assert.deepEqual(await storage.getItem('browser'), next);

  failRemoval = true;
  const lastFailure = storage.removeItem('browser');
  const removal = storage.removeItem('browser');
  await assert.rejects(lastFailure, (error) => error === originalError);
  await removal;
  assert.equal(await storage.getItem('browser'), null);
});

test('live tab cache retains recent tabs, evicts LRU and removes closed tabs', () => {
  const { selectLiveTabs } = loader()('src/hooks/liveTabs.ts');
  const ids = new Set(['a', 'b', 'c', 'd']);
  let live = [];
  for (const id of ['a', 'b', 'c', 'a', 'd']) live = selectLiveTabs(live, id, ids);
  assert.deepEqual(Array.from(live), ['c', 'a', 'd']);
  assert.equal(selectLiveTabs(live, 'd', ids), live);
  ids.delete('a');
  live = selectLiveTabs(live, 'c', ids);
  assert.deepEqual(Array.from(live), ['d', 'c']);
  assert.deepEqual(Array.from(selectLiveTabs(live, null, new Set())), []);
});
