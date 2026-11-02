const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { insert } = require('../plugins/withPageTools');

function loadTools() {
  const state = require('zustand/vanilla').createStore;
  const source = fs.readFileSync(path.join(__dirname, '../src/components/browser/PageTools.tsx'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports, require: (name) => {
    if (name === 'react-native') return { NativeModules: {}, StyleSheet: { create: (value) => value } };
    if (name === 'zustand') return { create: state };
    return {};
  } });
  return exports;
}

test('page commands are transient, repeatable and dismiss before navigation', () => {
  const tools = loadTools();
  assert.equal(tools.closePageTools(), false);
  tools.requestPageTool('find');
  const first = tools.usePageTools.getState().request;
  tools.requestPageTool('find');
  assert.equal(tools.usePageTools.getState().request, first + 1);
  assert.equal(tools.closePageTools(), true);
  assert.equal(tools.usePageTools.getState().action, null);
  assert.equal(tools.closePageTools(), false);
});

test('native plugin insertion is idempotent and fails on unknown templates', () => {
  const anchor = 'PackageList(this).packages.apply {';
  const addition = '          add(PageToolsPackage())';
  const result = insert(anchor + '\n}', anchor, addition);
  assert.equal(insert(result, anchor, addition), result);
  assert.equal(result.split('add(PageToolsPackage())').length, 2);
  assert.throws(() => insert('unexpected template', anchor, addition), /missing native integration anchor/);
});
