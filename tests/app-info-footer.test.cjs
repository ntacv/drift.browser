const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const appConfig = require('../app.json');
const website = 'https://drift-browser.vercel.app/';

const renderFooter = (expoConfig, openURL) => {
  const filename = path.join(root, 'src', 'components', 'common', 'AppInfoFooter.tsx');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const warnings = [];
  vm.runInNewContext(output, {
    exports,
    console: { warn: (...args) => warnings.push(args) },
    require: (name) => {
      if (name === 'react') return { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
      if (name === 'react-native') return {
        View: 'View', Text: 'Text', Pressable: 'Pressable',
        StyleSheet: { create: (styles) => styles }, Linking: { openURL },
      };
      if (name === 'expo-constants') return { expoConfig };
      if (name.endsWith('/app.json')) return appConfig;
      if (name.endsWith('/theme')) return { useTheme: () => ({ theme: { text: '#fff', text3: '#aaa', accent: '#abc' } }) };
      throw new Error(name);
    },
  });
  return { tree: exports.AppInfoFooter(), warnings };
};

const text = (node) => node.props.children.join('');

test('footer displays runtime app metadata and opens the official website', async () => {
  let opened;
  const { tree } = renderFooter({ name: 'Drift Browser', version: '1.3.6' }, async (url) => { opened = url; });
  const [name, version, link] = tree.props.children;
  assert.equal(text(name), 'Drift Browser');
  assert.equal(text(version), 'v1.3.6');
  assert.equal(link.props.accessibilityRole, 'link');
  assert.equal(link.props.accessibilityLabel, website);
  assert.equal(text(link.props.children[0]), website);
  assert.ok(link.props.style.minHeight >= 44);
  link.props.onPress();
  await Promise.resolve();
  assert.equal(opened, website);
});

test('footer falls back to app configuration and handles failed website launches', async () => {
  const { tree, warnings } = renderFooter(undefined, () => Promise.reject(new Error('Unavailable')));
  const [name, version, link] = tree.props.children;
  assert.equal(text(name), appConfig.expo.name);
  assert.equal(text(version), `v${appConfig.expo.version}`);
  link.props.onPress();
  await Promise.resolve();
  assert.equal(warnings.length, 1);
});

test('settings places app information after the final card and preserves the debug hotspot', () => {
  const screen = fs.readFileSync(path.join(root, 'src', 'screens', 'SettingsScreen.tsx'), 'utf8');
  const footer = screen.indexOf('<AppInfoFooter />');
  assert.ok(footer > screen.indexOf('onPress={handleExportData}'));
  assert.ok(footer < screen.indexOf('style={styles.debugHotspot}'));
  assert.ok(screen.indexOf('style={styles.debugHotspot}') < screen.indexOf('</ScrollView>'));
});
