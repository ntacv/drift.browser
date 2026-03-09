import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_NEW_WORKSPACE_COLOR, SHEET_HANDLE_COLOR } from '../../../default-settings';
import { useSheetGesture } from '../../hooks/useGestures';
import { useI18n } from '../../i18n/useI18n';
import { useBrowserStore, getActiveTab } from '../../store/browserStore';
import { useTheme } from '../../theme';
import * as fxaService from '../../services/fxaService';

const SHEET_HEIGHT = 360;
const TILE_GAP = 8;
const TILE_SPAN_COUNT = 4;

interface MenuSheetProps {
  onOpenSettings: () => void;
}

type MenuTileId =
  | 'share'
  | 'settings'
  | 'workspace'
  | 'signout';

type QuickTileId = 'back' | 'forward' | 'refresh' | 'fullscreen';
type DisplayTileId = QuickTileId | MenuTileId;
type TileSize = 's' | 'm' | 'l';

interface DisplayTile {
  id: DisplayTileId;
  size: TileSize;
}

const DEFAULT_TILE_ORDER: MenuTileId[] = [
  'share',
  'settings',
  'workspace',
  'signout',
];

const QUICK_TILES: DisplayTile[] = [
  { id: 'back', size: 's' },
  { id: 'forward', size: 's' },
  { id: 'refresh', size: 's' },
  { id: 'fullscreen', size: 's' },
];

const MENU_TILE_SIZE: Record<MenuTileId, TileSize> = {
  share: 'm',
  settings: 'm',
  workspace: 'm',
  signout: 'm',
};

const QUICK_TILE_IDS = new Set<QuickTileId>(['back', 'forward', 'refresh', 'fullscreen']);

export const MenuSheet = ({ onOpenSettings }: MenuSheetProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [draggedTile, setDraggedTile] = useState<MenuTileId | null>(null);
  const [tileAreaWidth, setTileAreaWidth] = useState(0);

  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const syncUser = useBrowserStore((state) => state.syncUser);
  const lastSyncedAt = useBrowserStore((state) => state.lastSyncedAt);
  const setSyncUser = useBrowserStore((state) => state.setSyncUser);
  const menuTileOrder = useBrowserStore((state) => state.menuTileOrder);
  const setMenuTileOrder = useBrowserStore((state) => state.setMenuTileOrder);
  const createWorkspace = useBrowserStore((state) => state.createWorkspace);
  const isUserFullscreen = useBrowserStore((state) => state.isUserFullscreen);
  const setUserFullscreen = useBrowserStore((state) => state.setUserFullscreen);
  const requestActiveTabNavigation = useBrowserStore((state) => state.requestActiveTabNavigation);
  const activeTab = useBrowserStore(getActiveTab);

  const gesture = useSheetGesture({
    isOpen: isMenuOpen,
    sheetHeight: SHEET_HEIGHT,
    onOpenChange: setMenuOpen,
  });

  const actionButtonStyle = [styles.actionButton, { backgroundColor: theme.surface2 }];

  const getMenuTileLabel = (id: MenuTileId): string => {
    if (id === 'share') {
      return t('menuShareUrl');
    }
    if (id === 'settings') {
      return t('menuSettings');
    }
    if (id === 'workspace') {
      return t('menuNewWorkspace');
    }
    return t('menuSignOut');
  };

  const tileOrder = useMemo<MenuTileId[]>(() => {
    const filtered = (menuTileOrder as MenuTileId[]).filter((id) => DEFAULT_TILE_ORDER.includes(id));
    const missing = DEFAULT_TILE_ORDER.filter((id) => !filtered.includes(id));
    return [...filtered, ...missing];
  }, [menuTileOrder]);

  const swapTiles = (fromId: MenuTileId, toId: MenuTileId) => {
    const fromIndex = tileOrder.indexOf(fromId);
    const toIndex = tileOrder.indexOf(toId);

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const next = [...tileOrder];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    setMenuTileOrder(next);
  };

  const columnUnit = useMemo(() => {
    if (tileAreaWidth <= 0) {
      return 0;
    }

    const availableWidth = Math.floor(tileAreaWidth);
    const totalGapWidth = TILE_GAP * (TILE_SPAN_COUNT - 1);
    const usableWidth = Math.max(availableWidth - totalGapWidth, 0);

    return usableWidth / TILE_SPAN_COUNT;
  }, [tileAreaWidth]);

  const tileFrameStyle = (size: TileSize) => {
    const span = size === 's' ? 1 : size === 'm' ? 2 : TILE_SPAN_COUNT;
    const width = columnUnit > 0
      ? Math.floor(columnUnit * span + TILE_GAP * (span - 1))
      : 0;

    if (width <= 0) {
      return null;
    }

    return { width };
  };

  const toggleFullscreen = () => {
    if (!isUserFullscreen) {
      setUserFullscreen(true);
      Alert.alert(
        t('fullscreenEnabledTitle'),
        t('fullscreenEnabledMessage'),
      );
    } else {
      setUserFullscreen(false);
    }
    setMenuOpen(false);
  };

  const executeTileAction = async (id: MenuTileId) => {
    if (id === 'share') {
      const url = activeTab?.url;
      if (!url) {
        Alert.alert(t('share'), t('noActiveTab'));
        return;
      }

      try {
        await Share.share({
          message: url,
          url,
        });
      } catch {
        Alert.alert(t('share'), url);
      }

      setMenuOpen(false);
    } else if (id === 'settings') {
      setMenuOpen(false);
      onOpenSettings();
    } else if (id === 'workspace') {
      createWorkspace(t('menuNewWorkspace'), 'star', DEFAULT_NEW_WORKSPACE_COLOR);
      setMenuOpen(false);
    } else if (id === 'signout') {
      fxaService.signOut().then(() => setSyncUser(null));
    }
  };

  const renderMenuTile = (id: MenuTileId) => {
    const handlePress = () => {
      if (draggedTile && draggedTile !== id) {
        swapTiles(draggedTile, id);
        setDraggedTile(null);
        return;
      }

      // Execute tile action when not in drag mode
      if (!draggedTile) {
        executeTileAction(id);
      }
    };

    const baseProps = {
      style: actionButtonStyle,
      onPress: handlePress,
    };

    if (id === 'share') {
      return (
        <Pressable key={id} {...baseProps}>
          <MaterialIcons name="ios-share" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>{getMenuTileLabel(id)}</Text>
        </Pressable>
      );
    }

    if (id === 'settings') {
      return (
        <Pressable key={id} {...baseProps}>
          <MaterialIcons name="settings" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>{getMenuTileLabel(id)}</Text>
        </Pressable>
      );
    }

    if (id === 'workspace') {
      return (
        <Pressable key={id} {...baseProps}>
          <MaterialIcons name="workspaces-outline" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>{getMenuTileLabel(id)}</Text>
        </Pressable>
      );
    }

    return (
      <Pressable key={id} {...baseProps}>
        <MaterialIcons name="logout" size={18} color={theme.danger} style={styles.actionIcon} />
        <Text style={[styles.actionText, { color: theme.danger }]}>{getMenuTileLabel(id)}</Text>
      </Pressable>
    );
  };

  const renderQuickTile = (id: QuickTileId) => {
    if (id === 'back') {
      return (
        <Pressable
          key={id}
          onPress={() => requestActiveTabNavigation('back')}
          disabled={!activeTab?.canGoBack}
          style={[
            styles.quickActionButton,
            { backgroundColor: theme.surface2 },
            !activeTab?.canGoBack && styles.quickActionDisabled,
          ]}
        >
          <MaterialIcons name="arrow-back" size={18} color={theme.text} />
        </Pressable>
      );
    }

    if (id === 'forward') {
      return (
        <Pressable
          key={id}
          onPress={() => requestActiveTabNavigation('forward')}
          disabled={!activeTab?.canGoForward}
          style={[
            styles.quickActionButton,
            { backgroundColor: theme.surface2 },
            !activeTab?.canGoForward && styles.quickActionDisabled,
          ]}
        >
          <MaterialIcons name="arrow-forward" size={18} color={theme.text} />
        </Pressable>
      );
    }

    if (id === 'refresh') {
      return (
        <Pressable
          key={id}
          onPress={() => requestActiveTabNavigation('reload')}
          style={[styles.quickActionButton, { backgroundColor: theme.surface2 }]}
        >
          <MaterialIcons name="refresh" size={18} color={theme.text} />
        </Pressable>
      );
    }

    return (
      <Pressable
        key={id}
        onPress={toggleFullscreen}
        style={[styles.quickActionButton, { backgroundColor: theme.surface2 }]}
      >
        <MaterialIcons name={isUserFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={18} color={theme.text} />
      </Pressable>
    );
  };

  const DraggableTile = ({ id, size }: { id: MenuTileId; size: TileSize }) => {
    const scale = useSharedValue(1);
    const isDragging = draggedTile === id;

    const longPress = Gesture.LongPress()
      .minDuration(400)
      .onStart(() => {
        runOnJS(setDraggedTile)(id);
        scale.value = withSpring(1.05);
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: isDragging ? 0.7 : 1,
    }));

    return (
      <GestureDetector gesture={longPress}>
        <Animated.View style={[styles.tileWrap, tileFrameStyle(size), animatedStyle]}>
          {renderMenuTile(id)}
          {isDragging && (
            <View style={styles.dragHint}>
              <Text style={[styles.dragHintText, { color: theme.text2 }]}>{t('menuDragHint')}</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    );
  };

  const visibleTileOrder = tileOrder.filter((id) => !(id === 'signout' && !syncUser));

  const displayTiles = useMemo<DisplayTile[]>(() => {
    const menuTiles = visibleTileOrder.map((id) => ({ id, size: MENU_TILE_SIZE[id] }));

    return [...QUICK_TILES, ...menuTiles];
  }, [visibleTileOrder]);

  return (
    <GestureDetector gesture={gesture.panGesture}>
      <Animated.View
        pointerEvents={isMenuOpen ? 'auto' : 'none'}
        style={[
          styles.container,
          { backgroundColor: theme.surface, borderColor: theme.border },
          gesture.animatedStyle,
        ]}
      >
        <View style={styles.handle} />

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 10) + 150,
          }}
        >
          <View style={[styles.accountCard, { backgroundColor: theme.surface2 }]}>
            {syncUser ? (
              <>
                <Text style={[styles.accountTitle, { color: theme.text }]}>{syncUser.email}</Text>
                <Text style={[styles.accountSub, { color: theme.text2 }]}>{t('synced')}</Text>
                <Text style={[styles.accountSub, { color: theme.text3 }]}>
                  {t('lastSync')}: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : t('never')}
                </Text>
              </>
            ) : (
              <Pressable
                onPress={async () => {
                  const user = await fxaService.signIn();
                  if (user) {
                    setSyncUser(user);
                  } else {
                    Alert.alert(t('firefoxSignInNotConfiguredTitle'), t('firefoxSignInNotConfiguredMessage'));
                  }
                }}
              >
                <Text style={[styles.accountTitle, { color: theme.text }]}>{t('signInToFirefox')}</Text>
              </Pressable>
            )}
          </View>

          <View
            style={styles.tilesGrid}
            onLayout={(event) => {
              setTileAreaWidth(event.nativeEvent.layout.width);
            }}
          >
            {displayTiles.map((tile) => {
              if (QUICK_TILE_IDS.has(tile.id as QuickTileId)) {
                return (
                  <View key={tile.id} style={[styles.tileWrap, tileFrameStyle(tile.size)]}>
                    {renderQuickTile(tile.id as QuickTileId)}
                  </View>
                );
              }

              return <DraggableTile key={tile.id} id={tile.id as MenuTileId} size={tile.size} />;
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 14,
    height: SHEET_HEIGHT,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: SHEET_HANDLE_COLOR,
    marginBottom: 10,
  },
  scrollContent: {
    flex: 1,
  },
  accountCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  accountTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountSub: {
    fontSize: 12,
    marginTop: 4,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
    marginBottom: 10,
  },
  quickActionButton: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickActionDisabled: {
    opacity: 0.4,
  },
  actionButton: {
    width: '100%',
    borderRadius: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tileWrap: {
    alignSelf: 'flex-start',
    gap: 6,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  dragHint: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
