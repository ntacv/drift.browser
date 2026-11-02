const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath) {
  const cache = new Map();
  function moduleAt(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(output, {
      exports, console,
      require: (name) => {
        if (name === '@react-native-async-storage/async-storage') return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        if (name === '@expo/vector-icons') return { MaterialIcons: { glyphMap: { home: 1 } } };
        if (name.startsWith('.')) return moduleAt(path.resolve(path.dirname(filename), name + '.ts'));
        return require(name);
      },
    }, { filename });
    return exports;
  }
  return moduleAt(path.resolve(__dirname, '..', relativePath));
}
const layout = load('src\\utils\\menuLayout.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

test('normalization preserves omissions, validates IDs, and protects Settings', () => {
  assert.equal(layout.normalizeMenuTileOrder(undefined).length, 9);
  assert.deepEqual(plain(layout.normalizeMenuTileOrder([])), ['settings']);
  assert.deepEqual(plain(layout.normalizeMenuTileOrder(['refresh', 'bad', null, 'refresh'])), ['refresh', 'settings']);
  assert.deepEqual(plain(layout.removeMenuTile(['settings'], 'settings')), ['settings']);
  assert.deepEqual(plain(layout.removeMenuTile(['settings', 'refresh'], 'refresh')), ['settings']);
});

test('migration reproduces the old fixed quick actions and missing legacy actions', () => {
  assert.deepEqual(plain(layout.migrateMenuTileOrder(['workspace', 'share', 'workspace', 'bogus'])), [
    'back', 'forward', 'refresh', 'fullscreen', 'workspace', 'share', 'settings', 'history', 'signout',
  ]);
});

test('insertion moves instead of duplicating and supports both directions and append', () => {
  const initial = ['share', 'settings', 'refresh'];
  assert.deepEqual(plain(layout.insertMenuTile(initial, 'refresh', 'share')), ['refresh', 'share', 'settings']);
  assert.deepEqual(plain(layout.insertMenuTile(initial, 'share', null)), ['settings', 'refresh', 'share']);
  assert.deepEqual(plain(layout.insertMenuTile(initial, 'history', 'settings')), ['share', 'history', 'settings', 'refresh']);
  assert.strictEqual(layout.insertMenuTile(initial, 'share', 'share'), initial);
  assert.deepEqual(initial, ['share', 'settings', 'refresh']);
});

test('drop targets account for wrapped rows, gaps, and trailing insertion', () => {
  const frames = [
    { id: 'back', x: 0, y: 0, width: 70, height: 44 },
    { id: 'settings', x: 78, y: 0, width: 148, height: 44 },
    { id: 'share', x: 0, y: 52, width: 148, height: 60 },
  ];
  assert.equal(layout.menuDropTarget(frames, 0, 20), 'back');
  assert.equal(layout.menuDropTarget(frames, 80, 20), 'settings');
  assert.equal(layout.menuDropTarget(frames, 240, 20), 'share');
  assert.equal(layout.menuDropTarget(frames, 10, 70), 'share');
  assert.equal(layout.menuDropTarget(frames, 100, 120), null);
});

test('height shrinks to content and respects half-screen and available space', () => {
  assert.equal(layout.actionMenuHeight(160, 800, 700), 160);
  assert.equal(layout.actionMenuHeight(600, 800, 700), 400);
  assert.equal(layout.actionMenuHeight(600, 800, 180), 180);
  assert.equal(layout.actionMenuHeight(600, 320, 250), 160);
});

test('store migrates even without workspaces and persists intentional removals', () => {
  const store = load('src\\store\\browserStore.ts').useBrowserStore;
  const options = store.persist.getOptions();
  assert.equal(options.version, 8);
  assert.deepEqual(plain(store.getState().menuTileOrder), plain(layout.MENU_TILE_IDS));
  const old = options.migrate({ menuTileOrder: ['history', 'settings'] }, 7);
  assert.deepEqual(plain(old.menuTileOrder), ['back', 'forward', 'refresh', 'fullscreen', 'history', 'settings', 'share', 'workspace', 'signout']);
  store.getState().setMenuTileOrder(['signout', 'settings']);
  const saved = options.partialize(store.getState());
  const rehydrated = options.merge(plain(saved), store.getInitialState());
  assert.deepEqual(plain(rehydrated.menuTileOrder), ['signout', 'settings']);
  assert.deepEqual(plain(options.migrate({ menuTileOrder: ['settings'] }, 8).menuTileOrder), ['settings']);
  assert.deepEqual(plain(options.merge({ menuTileOrder: ['bad', 'refresh', 'refresh'] }, store.getState()).menuTileOrder), ['refresh', 'settings']);
});
