const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const renderSettings = (isLeftHandMode) => {
  const filename = path.resolve(__dirname, '..', 'src', 'screens', 'SettingsScreen.tsx');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const changes = [];
  const state = {
    isLeftHandMode, workspaces: {}, tabs: {},
    setLeftHandMode: (value) => changes.push(value),
  };
  const theme = { accent: '#abc', surface2: '#222', text: '#fff', text2: '#aaa' };
  const native = Object.fromEntries(['KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  native.Platform = { OS: 'android' };
  vm.runInNewContext(output, {
    exports,
    require: (name) => {
      if (name === 'react') return {
        createElement: (type, props, ...children) => typeof type === 'function'
          ? type({ ...props, children })
          : ({ type, props: { ...props, children } }),
        useState: (value) => [value, () => {}],
        useCallback: (callback) => callback,
      };
      if (name === 'react-native') return native;
      if (name === '@react-navigation/native') return { useNavigation: () => ({}), useFocusEffect: () => {} };
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) };
      if (name === '@expo/vector-icons') return { MaterialIcons: 'MaterialIcons' };
      if (name === 'expo-file-system/legacy') return {};
      if (name.endsWith('/fxaService')) return {};
      if (name.endsWith('/securityConfig')) return { isFirefoxSyncEnabled: () => false };
      if (name.endsWith('/useI18n')) return { useI18n: () => ({ language: 'en', t: (key) => key }) };
      if (name.endsWith('/translations')) return { APP_LANGUAGES: ['en'], getLanguageNativeName: (lang) => lang };
      if (name.endsWith('/browserStore')) return { useBrowserStore: (selector) => selector(state) };
      if (name.endsWith('/theme')) return { useTheme: () => ({ theme }) };
      if (name.endsWith('/default-settings')) return { TEXT_ON_COLORED_BACKGROUND: '#000' };
      if (name.endsWith('/dataTransferService')) return {};
      for (const component of ['AppAlertDialog', 'AnimatedSwitch', 'AppInfoFooter']) {
        if (name.endsWith(`/${component}`)) return { [component]: component };
      }
      throw new Error(name);
    },
  });
  return { tree: exports.SettingsScreen(), changes, theme };
};

const find = (node, predicate) => {
  if (Array.isArray(node)) return node.flatMap((child) => find(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...find(node.props.children, predicate)];
};

for (const initial of [false, true]) {
  test(`handedness buttons reflect saved ${initial ? 'left' : 'right'} mode and set explicit values`, () => {
    const { tree, changes, theme } = renderSettings(initial);
    const allGroups = find(tree, (node) => node.props.accessibilityRole === 'radiogroup');
    assert.deepEqual(allGroups.map((node) => node.props.accessibilityLabel), [
      'language', 'externalLinkSetting', 'defaultSearchEngine', 'handMode',
      'verticalTabListSize', 'theme', 'barPosition',
    ]);
    for (const options of allGroups) {
      assert.equal(options.props.style.marginLeft, 'auto');
      assert.equal(options.props.style.flexWrap, 'wrap');
      const [row] = find(tree, (node) => node.props.children?.includes(options));
      assert.equal(row.props.style.flexWrap, 'wrap');
      assert.equal(row.props.children[0].props.style[1].flexShrink, undefined);
    }
    const groups = allGroups.filter((node) => node.props.accessibilityLabel === 'handMode');
    assert.equal(groups.length, 1);
    const group = groups[0];
    assert.equal(group.props.style.flexDirection, 'row');
    assert.equal(group.props.style.marginLeft, 'auto');
    assert.equal(group.props.style.flexWrap, 'wrap');
    assert.equal(group.props.style.maxWidth, '100%');
    const rows = find(tree, (node) => node.props.children?.includes(group));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].props.style.flexWrap, 'wrap');
    assert.equal(rows[0].props.style.alignItems, 'center');
    assert.equal(rows[0].props.children[0].props.children[0], 'handMode');
    const buttons = find(group, (node) => node.props.accessibilityRole === 'radio');
    assert.equal(buttons.length, 2);
    buttons.forEach((button, index) => {
      const selected = initial === (index === 0);
      assert.equal(button.props.accessibilityLabel, index === 0 ? 'left' : 'right');
      assert.equal(button.props.accessibilityState.checked, selected);
      assert.equal(button.props.style[0].minHeight, 32);
      assert.equal(button.props.style[0].borderRadius, 999);
      assert.equal(button.props.style[0].flex, undefined);
      assert.equal(button.props.style.length, 2);
      assert.equal(button.props.style[1].backgroundColor, selected ? theme.accent : theme.surface2);
      button.props.onPress();
      button.props.onPress();
    });
    assert.deepEqual(changes, [true, true, false, false]);
    assert.equal(find(tree, (node) => node.props.accessibilityLabel === 'leftHandMode').length, 0);
  });
}
