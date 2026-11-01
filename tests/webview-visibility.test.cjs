const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

function render(visible) {
  const changes = [];
  const effects = [];
  const injected = [];
  const state = {
    tabs: { a: { id: 'a', url: 'https://example.com', pendingNavAction: null } },
    updateTabMeta: (id, patch) => changes.push(patch),
    setLinkActionPanel: (panel) => changes.push({ panel }),
  };
  class Value {
    interpolate() { return this; }
    stopAnimation() {}
  }
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useEffect: (callback) => effects.push(callback),
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value ?? { injectJavaScript: (script) => injected.push(script) } }),
    useState: (value) => [value, () => {}],
  };
  const webview = () => {};
  const linkPanel = () => {};
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'browser', 'WebViewWrapper.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    clearTimeout,
    require: (name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return {
        View: 'View', StyleSheet: { create: (styles) => styles },
        Animated: { Value, createAnimatedComponent: () => 'Icon' },
      };
      if (name === 'react-native-webview') return { WebView: webview };
      if (name.endsWith('/browserStore')) return { useBrowserStore: Object.assign((selector) => selector(state), { getState: () => state }) };
      if (name.endsWith('/browserPersistence')) return { TAB_RUNTIME_DEFAULTS: { canGoBack: false } };
      if (name.endsWith('/theme')) return { useTheme: () => ({ theme: { bg: '#000000' } }) };
      if (name.endsWith('/useWebView')) return { parseWebViewBridgeMessage: JSON.parse };
      if (name.endsWith('/externalLinks')) return { isWebViewUrl: () => true };
      if (name.endsWith('/useExternalLinks')) return {
        useExternalLinks: () => ({ pending: null, request: () => false, navigationStarted() {} }),
      };
      if (name.endsWith('/LinkActionPanel')) return { LinkActionPanel: linkPanel };
      return {};
    },
  });
  const tree = exports.WebViewWrapper({ tabId: 'a', visible });
  const children = tree.props.children.flat(Infinity);
  return { tree, changes, effects, injected, linkPanel, children, native: children.find((child) => child?.type === webview) };
}

test('hidden pages retain a WebView but cannot open foreground panels or fullscreen', () => {
  const result = render(false);
  assert.ok(result.native);
  assert.equal(result.tree.props.pointerEvents, 'none');
  assert.equal(result.tree.props.accessibilityElementsHidden, true);
  for (const message of [{ type: 'fullscreenEnter' }, { type: 'linkLongPress', href: 'https://example.org' }, { type: 'overscrollTop' }]) {
    result.native.props.onMessage({ nativeEvent: { data: JSON.stringify(message) } });
  }
  assert.equal(result.changes.length, 0);
  assert.equal(result.children.some((child) => child?.type === result.linkPanel), false);
  result.effects[1]();
  assert.equal(result.changes[0].webContentFullscreen, false);
  assert.equal(result.injected.length, 1);
  assert.equal(result.injected[0].includes('.pause('), false);
});

test('visible pages can open their panel and eviction clears native navigation metadata', () => {
  const result = render(true);
  result.native.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'linkLongPress', href: 'https://example.org' }) } });
  assert.equal(result.changes[0].panel.tabId, 'a');
  assert.equal(result.children.some((child) => child?.type === result.linkPanel), true);
  const cleanup = result.effects[0]();
  cleanup();
  assert.equal(result.changes.at(-1).canGoBack, false);
});
