const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadComponent(relativePath) {
  const memoValues = [];
  let memoIndex = 0;
  const sheetOptions = [];
  const theme = { spacing: {}, radius: {}, fontFamily: {} };
  const state = {
    workspaces: {},
    history: [],
    menuTileOrder: [],
    defaultNewTabUrl: '',
    urlOverlayOpenRequestId: 0,
    urlOverlayCloseRequestId: 0,
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useMemo: (factory, deps) => {
      const index = memoIndex++;
      const previous = memoValues[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        memoValues[index] = { value: factory(), deps };
      }
      return memoValues[index].value;
    },
    useState: (value) => [value, () => {}],
    useRef: (value) => ({ current: value }),
    useEffect: () => {},
  };
  const gesture = new Proxy({}, { get: () => () => gesture });
  const animated = {
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (factory) => factory(),
    withSpring: (value) => value,
    withTiming: (value) => value,
    runOnJS: (callback) => callback,
    interpolate: () => 0,
    Extrapolation: { CLAMP: 'clamp' },
  };
  const native = {
    StyleSheet: { create: (styles) => styles, absoluteFillObject: {} },
    useWindowDimensions: () => ({ height: 800, width: 400 }),
    Platform: { OS: 'android' },
  };
  const mocks = {
    react,
    'react-native': native,
    'react-native-reanimated': animated,
    'react-native-gesture-handler': { Gesture: { Pan: () => gesture, LongPress: () => gesture } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@expo/vector-icons': {},
    'expo-clipboard': {},
    'expo-haptics': {},
  };
  const filename = path.join(__dirname, '..', relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require: (name) => {
      if (mocks[name]) return mocks[name];
      if (name.endsWith('/useGestures')) return {
        useSheetGesture: (options) => {
          sheetOptions.push(options);
          return { animatedStyle: {} };
        },
      };
      if (name.endsWith('/useI18n')) return { useI18n: () => ({ t: (key) => key }) };
      if (name.endsWith('/browserStore')) return {
        useBrowserStore: (selector) => selector(state),
        getActiveTab: () => null,
      };
      if (name.endsWith('/theme')) return { useTheme: () => ({ theme }) };
      return {};
    },
  }, { filename });
  return {
    render: (name, props) => {
      memoIndex = 0;
      return exports[name](props);
    },
    sheetOptions,
  };
}

function findElement(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  for (const child of (tree.props?.children ?? []).flat(Infinity)) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

test('URL overlay retains its spring configuration across renders', () => {
  const component = loadComponent('src\\components\\shell\\UrlBar.tsx');
  component.render('UrlBar');
  component.render('UrlBar');
  const [first, second] = component.sheetOptions;
  assert.strictEqual(first.springConfig, second.springConfig);
  assert.deepEqual({ ...first.springConfig }, { damping: 24, stiffness: 340, mass: 0.65 });
  assert.equal(first.sheetHeight, second.sheetHeight);
});

test('menu tiles retain component identity across parent renders', () => {
  const component = loadComponent('src\\components\\shell\\MenuSheet.tsx');
  const props = { onOpenSettings() {}, onOpenHistory() {} };
  const first = component.render('MenuSheet', props);
  const second = component.render('MenuSheet', props);
  const isShareTile = (element) => element.props?.id === 'share';
  const firstTile = findElement(first, isShareTile);
  const secondTile = findElement(second, isShareTile);
  assert.ok(firstTile);
  assert.ok(secondTile);
  assert.strictEqual(firstTile.type, secondTile.type);
  assert.equal(firstTile.props.isDragging, false);
  assert.ok(firstTile.props.children.length);
});
