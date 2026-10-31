const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadStore() {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(output, {
      exports,
      console,
      require: (name) => {
        if (name === '@react-native-async-storage/async-storage') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        if (name === '@expo/vector-icons') return { MaterialIcons: { glyphMap: { home: 1 } } };
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.ts'));
        return require(name);
      },
    }, { filename });
    return exports;
  }
  return load(path.resolve(__dirname, '..', 'src', 'store', 'browserStore.ts')).useBrowserStore;
}

test('external app link preference defaults to ask and is included in persisted state', () => {
  const store = loadStore();
  assert.equal(store.getState().externalLinkAction, 'ask');
  for (const action of ['stay', 'external', 'ask']) {
    store.getState().setExternalLinkAction(action);
    assert.equal(store.getState().externalLinkAction, action);
    assert.equal(store.persist.getOptions().partialize(store.getState()).externalLinkAction, action);
  }
});

test('saved tabs initialize PiP requests when upgrading from main', () => {
  const store = loadStore();
  const options = store.persist.getOptions();
  const persisted = options.partialize(store.getState());
  const tabId = Object.keys(persisted.tabs)[0];
  const tabs = { ...persisted.tabs, [tabId]: { ...persisted.tabs[tabId] } };
  delete tabs[tabId].pendingPipRequestId;
  assert.ok(options.version > 7);
  const migrated = options.migrate({ ...persisted, tabs }, 7);
  assert.equal(migrated.tabs[tabId].pendingPipRequestId, 0);
  store.setState(migrated);
  store.getState().requestPip();
  assert.equal(store.getState().tabs[tabId].pendingPipRequestId, 1);
});

test('unchanged tab metadata preserves state and does not notify subscribers', () => {
  const store = loadStore();
  const before = store.getState();
  const tab = Object.values(before.tabs)[0];
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  for (let i = 0; i < 100; i++) {
    store.getState().updateTabMeta(tab.id, {
      url: tab.url,
      isLoading: tab.isLoading,
      scrollY: tab.scrollY,
      themeColor: tab.themeColor,
      hasVideo: tab.hasVideo,
    });
  }
  store.getState().updateTabMeta(tab.id, {});
  store.getState().updateTabMeta('missing-tab', { title: 'Missing' });
  assert.strictEqual(store.getState(), before);
  assert.strictEqual(store.getState().tabs[tab.id], tab);
  assert.equal(notifications, 0);
  unsubscribe();
});

test('changed metadata notifies once and preserves unrelated tabs', () => {
  const store = loadStore();
  const before = store.getState();
  const tab = Object.values(before.tabs)[0];
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  before.updateTabMeta(tab.id, { title: 'Updated title', scrollY: 20 });
  const after = store.getState();
  assert.notStrictEqual(after, before);
  assert.notStrictEqual(after.tabs[tab.id], tab);
  assert.equal(after.tabs[tab.id].title, 'Updated title');
  assert.equal(after.tabs[tab.id].scrollY, 20);
  assert.equal(after.tabs[tab.id].url, tab.url);
  for (const id of Object.keys(before.tabs)) {
    if (id !== tab.id) assert.strictEqual(after.tabs[id], before.tabs[id]);
  }
  after.updateTabMeta(tab.id, { title: 'Updated title', scrollY: 20 });
  assert.equal(notifications, 1);
  unsubscribe();
});
