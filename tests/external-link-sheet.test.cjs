const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

test('sheet places close in the header and both actions in one equal-width row', () => {
  const filename = path.resolve(__dirname, '..', 'src', 'components', 'browser', 'ExternalLinkSheet.tsx');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (value) => [value, () => {}],
  };
  const native = Object.fromEntries(['Modal', 'Pressable', 'ScrollView', 'Switch', 'Text', 'View'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles, absoluteFill: {} };
  vm.runInNewContext(output, {
    exports,
    require: (name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 24 }) };
      if (name.endsWith('/useI18n')) return { useI18n: () => ({ t: (key) => key }) };
      if (name.endsWith('/theme')) return { useTheme: () => ({ theme: {} }) };
      throw new Error(name);
    },
  });
  let closed = false;
  let chosen;
  const tree = exports.ExternalLinkSheet({ url: 'reddit://post/1', visible: true, failed: false, opening: false, onDismiss: () => { closed = true; }, onChoose: (...args) => { chosen = args; } });
  const sheet = tree.props.children[0].props.children[1];
  const header = sheet.props.children[0];
  const close = header.props.children[1];
  assert.equal(header.props.children[0].props.accessibilityRole, 'header');
  assert.equal(close.props.accessibilityLabel, 'close');
  close.props.onPress();
  assert.equal(closed, true);
  const actions = sheet.props.children.at(-1);
  assert.equal(actions.props.style.flexDirection, 'row');
  const [stay, open] = actions.props.children;
  assert.equal(stay.props.style[0].flex, 1);
  assert.equal(open.props.style[0].flex, 1);
  stay.props.onPress();
  assert.deepEqual(chosen, ['stay', false]);
  open.props.onPress();
  assert.deepEqual(chosen, ['external', false]);
  assert.equal(tree.props.animationType, 'slide');
});
