const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const slots = [];
  const refs = [];
  const effects = [];
  const changes = [];
  const calls = [];
  const sheets = [];
  let cursor = 0;
  let refCursor = 0;
  let effectCursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef: (initial) => {
      const index = refCursor++;
      return refs[index] ?? (refs[index] = { current: initial });
    },
    useCallback: (fn) => {
      const index = refCursor++;
      return refs[index] ?? (refs[index] = fn);
    },
    useEffect: (fn, deps) => {
      const index = effectCursor++;
      const old = effects[index];
      if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) {
        old?.cleanup?.();
        effects[index] = { deps, pending: fn };
      }
    },
  };
  const native = {
    View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text',
    StyleSheet: { create: (value) => value },
    useWindowDimensions: () => ({ width: 400, height: 800 }),
  };
  const utilityExports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'menuLayout.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: utilityExports });
  const exports = {};
  const filename = path.resolve(__dirname, '..', 'src', 'components', 'shell', 'ActionMenuPanel.tsx');
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, {
    exports, setInterval: () => 1, clearInterval: () => {},
    require: (name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react-native-reanimated') return { default: { View: 'AnimatedView' }, runOnJS: (fn) => fn, __esModule: true };
      if (name === 'react-native-gesture-handler') return {
        GestureDetector: 'GestureDetector',
        Gesture: { Pan: () => {
          const gesture = {};
          for (const method of ['enabled', 'activateAfterLongPress', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) {
            gesture[method] = (value) => { gesture[method + 'Value'] = value; return gesture; };
          }
          return gesture;
        } },
      };
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 20, bottom: 10 }) };
      if (name.endsWith('/menuLayout')) return utilityExports;
      if (name.endsWith('/useI18n')) return { useI18n: () => ({ t: (key) => key }) };
      if (name.endsWith('/theme')) return { useTheme: () => ({ theme: {} }) };
      if (name.endsWith('/useGestures')) return { useSheetGesture: (options) => { sheets.push(options); return { animatedStyle: {} }; } };
      return {};
    },
  }, { filename });
  const props = {
    open: true, order: ['back', 'refresh', 'settings', 'signout'], barPosition: 'bottom',
    actions: Object.fromEntries(utilityExports.MENU_TILE_IDS.map((id) => [id, { label: id, icon: 'settings', disabled: id === 'back' }])),
    onOrderChange: (order) => { changes.push([...order]); props.order = order; },
    onAction: (id) => calls.push(id), onOpenChange: (open) => { props.open = open; },
  };
  return {
    props, changes, calls, sheets,
    renderTile: (element) => {
      cursor = refCursor = effectCursor = 30;
      return element.type(element.props);
    },
    render: () => {
      cursor = refCursor = effectCursor = 0;
      const tree = exports.ActionMenuPanel(props);
      for (const effect of effects) {
        if (effect?.pending) { effect.cleanup = effect.pending(); delete effect.pending; }
      }
      return tree;
    },
  };
}
function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...(tree.props?.children ?? []).flat(Infinity).flatMap((child) => all(child, predicate))];
}
const tiles = (tree, picker = false) => all(tree, (node) => typeof node.type === 'function' && node.props.picker === picker);
const tile = (tree, id, picker = false) => tiles(tree, picker).find((node) => node.props.id === id);

test('long press enters editing on disabled navigation; all eight actions appear and Save finishes', () => {
  const h = harness();
  let tree = h.render();
  tile(tree, 'back').props.onPress();
  assert.deepEqual(h.calls, []);
  assert.equal(tile(tree, 'signout'), undefined);
  tile(tree, 'back').props.onEdit();
  tree = h.render();
  assert.equal(tiles(tree, true).length, 8);
  assert.equal(tile(tree, 'signout'), undefined);
  assert.equal(tile(tree, 'signout', true), undefined);
  const instructions = all(tree, (node) => node.type === 'Text' && node.props.children.includes('menuDropHere'));
  assert.equal(instructions.length, 1);
  const header = all(tree, (node) => node.props.onLayout && all(node, (child) => child === instructions[0]).length)[0];
  assert.ok(all(header, (node) => node.type === 'Text' && node.props.children.includes('menuAvailableActions')).length);
  assert.equal(all(tree, (node) => node.type === 'ScrollView' && all(node, (child) => child === instructions[0]).length).length, 0);
  tile(tree, 'refresh').props.onPress();
  assert.deepEqual(h.calls, []);
  tile(tree, 'history', true).props.onPress();
  assert.ok(h.props.order.includes('history'));
  tree = h.render();
  tile(tree, 'history', true).props.onPress();
  assert.equal(h.changes.length, 1);
  const save = all(tree, (node) => node.type === 'Pressable' && all(node, (child) => child.type === 'Text' && child.props.children.includes('save')).length)[0];
  save.props.onPress();
  tree = h.render();
  assert.equal(tiles(tree, true).length, 0);
  assert.equal(h.props.open, true);
  tile(tree, 'history').props.onPress();
  assert.deepEqual(h.calls, ['history']);
});

test('tile long press suppresses the action and edit pan forwards real coordinates', () => {
  const h = harness();
  let tree = h.render();
  let rendered = h.renderTile(tile(tree, 'refresh'));
  let pressable = all(rendered, (node) => node.type === 'Pressable')[0];
  pressable.props.onPressIn();
  pressable.props.onLongPress();
  pressable.props.onPress();
  assert.deepEqual(h.calls, []);
  tree = h.render();
  assert.equal(tiles(tree, true).length, 8);
  const source = tile(tree, 'history', true);
  const events = [];
  source.props.onDrag = (point) => events.push(['drag', point.x, point.y]);
  source.props.onDrop = (point) => events.push(['drop', point.x, point.y]);
  source.props.onCancel = () => events.push(['cancel']);
  source.props.onPress = () => events.push(['press']);
  rendered = h.renderTile(source);
  const gesture = rendered.props.gesture;
  assert.equal(gesture.enabledValue, true);
  pressable = all(rendered, (node) => node.type === 'Pressable')[0];
  pressable.props.onPressIn();
  const tileView = all(rendered, (node) => node.props.collapsable === false)[0];
  tileView.props.ref.current = { measureInWindow: (fn) => fn(10, 80, 180, 44) };
  gesture.onStartValue({ absoluteX: 20, absoluteY: 124, x: 10, y: 20 });
  gesture.onUpdateValue({ absoluteX: 40, absoluteY: 374 });
  gesture.onEndValue({ absoluteX: 40, absoluteY: 424 });
  gesture.onFinalizeValue({}, true);
  pressable.props.onPress();
  assert.deepEqual(events, [['drag', 20, 100], ['drag', 40, 350], ['drop', 40, 400]]);
  gesture.onFinalizeValue({}, false);
  assert.deepEqual(events.at(-1), ['cancel']);
});

test('delayed coordinate calibration uses the latest point and ignores canceled measurements', () => {
  const h = harness();
  let tree = h.render();
  tile(tree, 'settings').props.onEdit();
  tree = h.render();
  const source = tile(tree, 'history', true);
  const events = [];
  source.props.onDrag = (point) => events.push(['drag', point.x, point.y]);
  source.props.onDrop = (point) => events.push(['drop', point.x, point.y]);
  source.props.onCancel = () => events.push(['cancel']);
  const rendered = h.renderTile(source);
  const gesture = rendered.props.gesture;
  let measured;
  all(rendered, (node) => node.props.collapsable === false)[0].props.ref.current = {
    measureInWindow: (fn) => { measured = fn; },
  };
  gesture.onStartValue({ absoluteX: 20, absoluteY: 124, x: 10, y: 20 });
  gesture.onUpdateValue({ absoluteX: 40, absoluteY: 374 });
  gesture.onEndValue({ absoluteX: 40, absoluteY: 424 });
  assert.deepEqual(events, []);
  measured(10, 80);
  assert.deepEqual(events, [['drop', 40, 400]]);
  gesture.onStartValue({ absoluteX: 20, absoluteY: 124, x: 10, y: 20 });
  gesture.onFinalizeValue({}, false);
  measured(10, 80);
  assert.deepEqual(events, [['drop', 40, 400], ['cancel']]);
});

test('drag preview is centered on the same window-space finger point used for drops', () => {
  const h = harness();
  let tree = h.render();
  tile(tree, 'settings').props.onEdit();
  tree = h.render();
  tree.props.ref.current = { measureInWindow: (fn) => fn(0, 200) };
  tile(tree, 'history', true).props.onDrag({ id: 'history', x: 100, y: 400 });
  tree = h.render();
  const preview = all(tree, (node) => node.props.pointerEvents === 'none' && node.props.onLayout)[0];
  const position = Object.assign({}, ...preview.props.style);
  assert.equal(position.left + 60, 100);
  assert.equal(position.top + 22 + 200, 400);
  preview.props.onLayout({ nativeEvent: { layout: { height: 80 } } });
  tree = h.render();
  const resized = all(tree, (node) => node.props.pointerEvents === 'none' && node.props.onLayout)[0];
  assert.equal(Object.assign({}, ...resized.props.style).top + 40 + 200, 400);
});

test('remove and accessible reorder persist immediately, including across dismissal', () => {
  const h = harness();
  let tree = h.render();
  tile(tree, 'settings').props.onEdit();
  tree = h.render();
  tile(tree, 'settings').props.onRemove();
  assert.ok(h.props.order.includes('settings'));
  tile(tree, 'refresh').props.onMove(-1);
  assert.equal(h.props.order[0], 'refresh');
  tree = h.render();
  tile(tree, 'refresh').props.onRemove();
  assert.ok(!h.props.order.includes('refresh'));
  h.props.open = false;
  h.render();
  h.props.open = true;
  tree = h.render();
  assert.equal(tiles(tree, true).length, 0);
  assert.equal(tile(tree, 'refresh'), undefined);
  assert.ok(!h.props.order.includes('signout'));
});

test('measured menu grows and shrinks with content and caps at half the screen', () => {
  const h = harness();
  let tree = h.render();
  const content = all(tree, (node) => node.type === 'ScrollView')[0];
  content.props.onContentSizeChange(370, 200);
  h.render();
  assert.equal(h.sheets.at(-1).sheetHeight, 230);
  content.props.onContentSizeChange(370, 700);
  tree = h.render();
  assert.equal(h.sheets.at(-1).sheetHeight, 400);
  assert.equal(all(tree, (node) => node.type === 'ScrollView')[0].props.scrollEnabled, true);
  content.props.onContentSizeChange(370, 100);
  h.render();
  assert.equal(h.sheets.at(-1).sheetHeight, 130);
});

test('picker uses remaining height above the half-screen menu and closes below the URL bar', () => {
  const h = harness();
  let tree = h.render();
  all(tree, (node) => node.type === 'ScrollView')[0].props.onContentSizeChange(370, 700);
  tile(tree, 'settings').props.onEdit();
  tree = h.render();
  const scrolls = all(tree, (node) => node.type === 'ScrollView');
  scrolls[0].props.onContentSizeChange(370, 900);
  h.render();
  assert.equal(h.sheets.at(-1).sheetHeight, 692);
  assert.equal(h.sheets.at(-1).closedOffset, 78);
  h.props.barPosition = 'top';
  h.render();
  assert.equal(h.sheets.at(-1).sheetHeight, 702);
  assert.equal(h.sheets.at(-1).closedOffset, 10);
});

test('actual drop callbacks insert at measured positions, ignore outside drops, and cancel cleanly', () => {
  const h = harness();
  let tree = h.render();
  tile(tree, 'settings').props.onEdit();
  tree = h.render();
  const measured = all(tree, (node) => node.props.collapsable === false);
  const viewport = measured[0];
  const grid = measured[1];
  viewport.props.ref.current = { measureInWindow: (fn) => fn(0, 300, 400, 300) };
  grid.props.ref.current = { measureInWindow: (fn) => fn(14, 360, 370, 200) };
  const frames = all(grid, (node) => node.props.onLayout && node !== grid);
  frames.forEach((node, index) => node.props.onLayout({ nativeEvent: { layout: { x: index * 80, y: 0, width: 72, height: 44 } } }));
  tile(tree, 'history', true).props.onDrop({ id: 'history', x: 20, y: 370 });
  assert.equal(h.props.order[0], 'history');
  tree = h.render();
  const count = h.changes.length;
  tile(tree, 'share', true).props.onDrop({ id: 'share', x: 450, y: 370 });
  tile(tree, 'share', true).props.onCancel();
  assert.equal(h.changes.length, count);
  tile(tree, 'share', true).props.onDrop({ id: 'share', x: 300, y: 550 });
  assert.equal(h.props.order.at(-1), 'share');
});
