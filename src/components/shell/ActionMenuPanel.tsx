import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { SHEET_HANDLE_COLOR } from '../../../default-settings';
import { useSheetGesture } from '../../hooks/useGestures';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme';
import {
  actionMenuHeight, insertMenuTile, menuDropTarget, MENU_TILE_IDS, MENU_TILE_SIZE,
  normalizeMenuTileOrder, removeMenuTile, type MenuTileId, type TileFrame,
} from '../../utils/menuLayout';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
export interface MenuAction {
  label: string;
  icon: IconName;
  disabled?: boolean;
  danger?: boolean;
}
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: MenuTileId[];
  onOrderChange: (order: MenuTileId[]) => void;
  signedIn: boolean;
  barPosition: 'top' | 'bottom';
  actions: Record<MenuTileId, MenuAction>;
  onAction: (id: MenuTileId) => void;
  children: React.ReactNode;
}
interface DragPoint { id: MenuTileId; x: number; y: number }
interface MenuActionTileProps {
  id: MenuTileId;
  action: MenuAction;
  width: number;
  editing: boolean;
  selected?: boolean;
  picker?: boolean;
  isDragging: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDrag: (point: DragPoint) => void;
  onDrop: (point: DragPoint) => void;
  onCancel: () => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
}

// Keep the component identity stable as the menu resizes during editing.
const MenuActionTile = ({ id, action, width, editing, selected, picker, isDragging, onPress, onEdit, onDrag, onDrop, onCancel, onRemove, onMove }: MenuActionTileProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const suppressPress = useRef(false);
  const startDrag = (point: DragPoint) => {
    suppressPress.current = true;
    onDrag(point);
  };
  const pan = Gesture.Pan()
    .enabled(editing && !selected)
    .activateAfterLongPress(180)
    .onStart((event) => runOnJS(startDrag)({ id, x: event.absoluteX, y: event.absoluteY }))
    .onUpdate((event) => runOnJS(onDrag)({ id, x: event.absoluteX, y: event.absoluteY }))
    .onEnd((event) => runOnJS(onDrop)({ id, x: event.absoluteX, y: event.absoluteY }))
    .onFinalize((_event, success) => { if (!success) runOnJS(onCancel)(); });
  const color = action.danger ? theme.danger : theme.text;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={{ width, opacity: isDragging ? 0.45 : 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action.label}${picker ? `, ${t(selected ? 'menuAdded' : 'menuAdd')}` : ''}`}
          accessibilityState={{ disabled: picker ? selected : !editing && action.disabled, selected }}
          accessibilityActions={editing && !picker ? [
            { name: 'increment', label: t('menuMoveLater') },
            { name: 'decrement', label: t('menuMoveEarlier') },
            ...(id === 'settings' ? [] : [{ name: 'remove', label: t('menuRemove') }]),
          ] : []}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'remove') onRemove();
            else if (nativeEvent.actionName === 'increment') onMove(1);
            else if (nativeEvent.actionName === 'decrement') onMove(-1);
          }}
          onPressIn={() => { suppressPress.current = false; }}
          onLongPress={() => { suppressPress.current = true; onEdit(); }}
          delayLongPress={400}
          onPress={() => { if (!suppressPress.current && !isDragging) onPress(); }}
          style={[styles.tile, { backgroundColor: theme.surface2, opacity: (!editing && action.disabled) || selected ? 0.5 : 1 }]}
        >
          <MaterialIcons name={action.icon} size={18} color={color} />
          {(picker || MENU_TILE_SIZE[id] !== 's') && <Text style={[styles.label, { color }]}>{action.label}</Text>}
          {selected && <MaterialIcons name="check" size={14} color={color} />}
        </Pressable>
        {editing && !picker && id !== 'settings' && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('menuRemove')} ${action.label}`} onPress={onRemove} style={[styles.remove, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="close" size={16} color={theme.danger} />
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

export function ActionMenuPanel({ open, onOpenChange, order: storedOrder, onOrderChange, signedIn, barPosition, actions, onAction, children }: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [editing, setEditing] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [pickerContentHeight, setPickerContentHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(52);
  const [gridWidth, setGridWidth] = useState(0);
  const [drag, setDrag] = useState<DragPoint | null>(null);
  const [target, setTarget] = useState<{ before: MenuTileId | null } | null>(null);
  const root = useRef<View>(null);
  const grid = useRef<View>(null);
  const viewport = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const frames = useRef(new Map<MenuTileId, TileFrame>());
  const rootOrigin = useRef({ x: 0, y: 0 });
  const pointer = useRef<DragPoint | null>(null);
  const scrollOffset = useRef(0);
  const dragGeneration = useRef(0);
  const order = normalizeMenuTileOrder(storedOrder);
  const visible = order.filter((id) => id !== 'signout' || signedIn || editing);
  const bottom = barPosition === 'bottom' ? 68 + Math.max(insets.bottom, 4) : Math.max(insets.bottom, 10);
  const topClearance = insets.top + (barPosition === 'top' ? 68 : 10);
  const available = Math.max(0, height - bottom - topClearance);
  const pickerReserve = editing ? Math.min(headerHeight + 52, available / 2) : 0;
  const menuHeight = actionMenuHeight(contentHeight + 30, height, available - pickerReserve);
  const pickerHeight = editing ? Math.min(headerHeight + pickerContentHeight, Math.max(0, available - menuHeight)) : 0;
  const sheet = useSheetGesture({ isOpen: open, sheetHeight: menuHeight + pickerHeight, closedOffset: bottom, onOpenChange });
  const unit = Math.max(0, ((gridWidth || width - 28) - 24) / 4);
  const tileWidth = (id: MenuTileId) => {
    const span = MENU_TILE_SIZE[id] === 's' ? 1 : MENU_TILE_SIZE[id] === 'm' ? 2 : 4;
    return Math.floor(unit * span + 8 * (span - 1));
  };

  const cancelDrag = useCallback(() => {
    dragGeneration.current++;
    pointer.current = null;
    setDrag(null);
    setTarget(null);
  }, []);

  useEffect(() => {
    if (!open) { setEditing(false); cancelDrag(); }
  }, [open, cancelDrag]);
  useEffect(() => { cancelDrag(); }, [width, height, cancelDrag]);
  useEffect(() => () => { dragGeneration.current++; pointer.current = null; }, []);

  const locate = (point: DragPoint, commit: boolean) => {
    if (!viewport.current || !grid.current) {
      if (commit) cancelDrag();
      return;
    }
    const generation = dragGeneration.current;
    viewport.current?.measureInWindow((vx, vy, vw, vh) => {
      if (generation !== dragGeneration.current) return;
      if (point.x < vx || point.x > vx + vw || point.y < vy || point.y > vy + vh) {
        setTarget(null);
        if (commit) cancelDrag();
        return;
      }
      if (!commit) {
        const delta = point.y < vy + 32 ? -18 : point.y > vy + vh - 32 ? 18 : 0;
        if (delta) scroll.current?.scrollTo({ y: Math.max(0, scrollOffset.current + delta), animated: false });
      }
      grid.current?.measureInWindow((gx, gy) => {
        if (generation !== dragGeneration.current) return;
        const orderedFrames = visible.map((id) => frames.current.get(id)).filter((frame): frame is TileFrame => Boolean(frame));
        // Account/header space is not a drop target; below the final row appends.
        if (point.y < gy) {
          setTarget(null);
          if (commit) cancelDrag();
          return;
        }
        const before = menuDropTarget(orderedFrames, point.x - gx, point.y - gy);
        setTarget({ before });
        if (commit) {
          onOrderChange(insertMenuTile(order, point.id, before));
          cancelDrag();
        }
      });
    });
  };
  const locateRef = useRef(locate);
  locateRef.current = locate;
  useEffect(() => {
    if (!drag) return;
    const timer = setInterval(() => {
      if (pointer.current) locateRef.current(pointer.current, false);
    }, 60);
    return () => clearInterval(timer);
  }, [Boolean(drag)]);

  const onDrag = (point: DragPoint) => {
    pointer.current = point;
    root.current?.measureInWindow((x, y) => { rootOrigin.current = { x, y }; });
    setDrag(point);
    locate(point, false);
  };
  const move = (id: MenuTileId, direction: number) => {
    const index = order.indexOf(id);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    onOrderChange(insertMenuTile(order, id, direction < 0 ? order[next] : order[next + 1] ?? null));
  };
  const tile = (id: MenuTileId, picker = false) => (
    <MenuActionTile
      id={id} action={actions[id]} width={picker ? Math.max(0, (width - 38) / 2) : tileWidth(id)}
      editing={editing} picker={picker} selected={picker && order.includes(id)} isDragging={drag?.id === id}
      onEdit={() => setEditing(true)}
      onPress={() => {
        if (drag) return;
        if (picker) { if (!order.includes(id)) onOrderChange(insertMenuTile(order, id, null)); }
        else if (!editing && !actions[id].disabled) onAction(id);
      }}
      onDrag={onDrag} onDrop={(point) => locate(point, true)} onCancel={cancelDrag}
      onRemove={() => onOrderChange(removeMenuTile(order, id))} onMove={(direction) => move(id, direction)}
    />
  );

  return (
    <Animated.View ref={root} pointerEvents={open ? 'auto' : 'none'} style={[styles.container, { bottom }, sheet.animatedStyle]}>
      {editing && (
        <View style={[styles.panel, { height: pickerHeight, backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{t('menuAvailableActions')}</Text>
            <Pressable accessibilityRole="button" onPress={() => { cancelDrag(); setEditing(false); }} style={styles.save}>
              <Text style={[styles.title, { color: theme.text }]}>{t('save')}</Text>
            </Pressable>
          </View>
          <ScrollView onContentSizeChange={(_w, h) => setPickerContentHeight(h)} style={styles.scroll} contentContainerStyle={styles.picker}>
            {MENU_TILE_IDS.map((id) => <View key={id}>{tile(id, true)}</View>)}
          </ScrollView>
        </View>
      )}
      <View style={[styles.panel, { height: menuHeight, backgroundColor: theme.surface, borderColor: theme.border }]}>
        <GestureDetector gesture={sheet.panGesture}>
          <View accessibilityLabel={t('actionMenu')} style={styles.handleArea}><View style={styles.handle} /></View>
        </GestureDetector>
        <View ref={viewport} collapsable={false} style={styles.scroll}>
          <ScrollView ref={scroll} onContentSizeChange={(_w, h) => setContentHeight(h)} scrollEnabled={contentHeight > menuHeight - 30} scrollEventThrottle={16} onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }} contentContainerStyle={styles.content}>
            <View pointerEvents={editing ? 'none' : 'auto'} accessibilityElementsHidden={editing} importantForAccessibility={editing ? 'no-hide-descendants' : 'auto'}>{children}</View>
            <View ref={grid} collapsable={false} style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
              {visible.map((id) => (
                <View key={id} onLayout={(event) => frames.current.set(id, { id, ...event.nativeEvent.layout })} style={{ borderRadius: 12, backgroundColor: target?.before === id ? theme.text2 : 'transparent' }}>
                  {tile(id)}
                  {target?.before === id && <View pointerEvents="none" style={[styles.insertion, { backgroundColor: theme.text }]} />}
                </View>
              ))}
            </View>
            {editing && <Text style={[styles.dropHint, { color: target && target.before === null ? theme.text : theme.text2 }]}>{t('menuDropHere')}</Text>}
          </ScrollView>
        </View>
      </View>
      {drag && <View pointerEvents="none" style={[styles.preview, { left: drag.x - rootOrigin.current.x - 50, top: drag.y - rootOrigin.current.y - 50, backgroundColor: theme.surface2, borderColor: theme.text2 }]}><Text style={[styles.label, { color: theme.text }]}>{actions[drag.id].label}</Text></View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0 },
  panel: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  handleArea: { height: 28, justifyContent: 'center', alignItems: 'center' },
  handle: { height: 4, width: 44, borderRadius: 999, backgroundColor: SHEET_HANDLE_COLOR },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 14, paddingBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  title: { fontSize: 14, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  save: { minHeight: 48, minWidth: 60, justifyContent: 'center', alignItems: 'center' },
  tile: { minHeight: 44, borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  remove: { position: 'absolute', top: -5, right: -3, width: 26, height: 26, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  insertion: { position: 'absolute', left: -4, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  dropHint: { paddingTop: 12, textAlign: 'center', fontSize: 12 },
  preview: { position: 'absolute', width: 120, minHeight: 44, padding: 10, borderRadius: 12, borderWidth: 1, elevation: 10, zIndex: 20 },
});
