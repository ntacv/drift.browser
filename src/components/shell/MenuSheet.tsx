import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useSheetGesture } from '../../hooks/useGestures';
import { useBrowserStore, getActiveTab } from '../../store/browserStore';
import { useTheme } from '../../theme';
import * as fxaService from '../../services/fxaService';

const SHEET_HEIGHT = 360;

interface MenuSheetProps {
  onOpenSettings: () => void;
}

type MenuTileId =
  | 'bookmark'
  | 'share'
  | 'settings'
  | 'workspace'
  | 'fullscreen'
  | 'reorder'
  | 'signout';

const DEFAULT_TILE_ORDER: MenuTileId[] = [
  'bookmark',
  'share',
  'settings',
  'workspace',
  'fullscreen',
  'reorder',
  'signout',
];

export const MenuSheet = ({ onOpenSettings }: MenuSheetProps) => {
  const { theme } = useTheme();
  const [isReorderMode, setIsReorderMode] = useState(false);

  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const syncUser = useBrowserStore((state) => state.syncUser);
  const lastSyncedAt = useBrowserStore((state) => state.lastSyncedAt);
  const setSyncUser = useBrowserStore((state) => state.setSyncUser);
  const menuTileOrder = useBrowserStore((state) => state.menuTileOrder);
  const setMenuTileOrder = useBrowserStore((state) => state.setMenuTileOrder);
  const addBookmarkFromActiveTab = useBrowserStore((state) => state.addBookmarkFromActiveTab);
  const createWorkspace = useBrowserStore((state) => state.createWorkspace);
  const isFullscreen = useBrowserStore((state) => state.isFullscreen);
  const setFullscreen = useBrowserStore((state) => state.setFullscreen);
  const activeTab = useBrowserStore(getActiveTab);

  const gesture = useSheetGesture({
    isOpen: isMenuOpen,
    sheetHeight: SHEET_HEIGHT,
    onOpenChange: setMenuOpen,
  });

  const actionButtonStyle = [styles.actionButton, { backgroundColor: theme.surface2 }];

  const tileOrder = useMemo<MenuTileId[]>(() => {
    const filtered = (menuTileOrder as MenuTileId[]).filter((id) => DEFAULT_TILE_ORDER.includes(id));
    const missing = DEFAULT_TILE_ORDER.filter((id) => !filtered.includes(id));
    return [...filtered, ...missing];
  }, [menuTileOrder]);

  const moveTile = (id: MenuTileId, direction: -1 | 1) => {
    const index = tileOrder.indexOf(id);
    if (index < 0) {
      return;
    }

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tileOrder.length) {
      return;
    }

    const next = [...tileOrder];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setMenuTileOrder(next);
  };

  const renderTile = (id: MenuTileId) => {
    const baseProps = {
      style: actionButtonStyle,
    };

    if (id === 'bookmark') {
      return (
        <Pressable
          key={id}
          {...baseProps}
          onPress={() => {
            addBookmarkFromActiveTab();
            Alert.alert('Saved', 'Active tab bookmarked.');
          }}
        >
          <MaterialIcons name="star-border" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>Bookmark</Text>
        </Pressable>
      );
    }

    if (id === 'share') {
      return (
        <Pressable
          key={id}
          {...baseProps}
          onPress={() => {
            Alert.alert('Share', activeTab?.url ?? 'No active tab');
          }}
        >
          <MaterialIcons name="ios-share" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>Share URL</Text>
        </Pressable>
      );
    }

    if (id === 'settings') {
      return (
        <Pressable
          key={id}
          {...baseProps}
          onPress={() => {
            setMenuOpen(false);
            onOpenSettings();
          }}
        >
          <MaterialIcons name="settings" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>Settings</Text>
        </Pressable>
      );
    }

    if (id === 'workspace') {
      return (
        <Pressable
          key={id}
          {...baseProps}
          onPress={() => {
            createWorkspace('New Workspace', '✨', '#7E57C2');
            setMenuOpen(false);
          }}
        >
          <MaterialIcons name="workspaces-outline" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>New Workspace</Text>
        </Pressable>
      );
    }

    if (id === 'fullscreen') {
      return (
        <Pressable
          key={id}
          {...baseProps}
          onPress={() => {
            if (!isFullscreen) {
              setFullscreen(true);
              Alert.alert(
                'Fullscreen enabled',
                'The URL bar is now hidden. To open the app menu again, pull down past the top of the webpage.',
              );
            } else {
              setFullscreen(false);
            }

            setMenuOpen(false);
          }}
        >
          <MaterialIcons
            name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
            size={18}
            color={theme.text}
            style={styles.actionIcon}
          />
          <Text style={[styles.actionText, { color: theme.text }]}>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Text>
        </Pressable>
      );
    }

    if (id === 'reorder') {
      return (
        <Pressable
          key={id}
          {...baseProps}
          onPress={() => {
            setIsReorderMode((prev) => !prev);
          }}
        >
          <MaterialIcons name="swap-horiz" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            {isReorderMode ? 'Done Reordering' : 'Reorganize Tiles'}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={id}
        {...baseProps}
        onPress={async () => {
          await fxaService.signOut();
          setSyncUser(null);
        }}
      >
        <MaterialIcons name="logout" size={18} color={theme.danger} style={styles.actionIcon} />
        <Text style={[styles.actionText, { color: theme.danger }]}>Sign Out</Text>
      </Pressable>
    );
  };

  const visibleTileOrder = tileOrder.filter((id) => !(id === 'signout' && !syncUser));

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

        <View style={[styles.accountCard, { backgroundColor: theme.surface2 }]}> 
          {syncUser ? (
            <>
              <Text style={[styles.accountTitle, { color: theme.text }]}>{syncUser.email}</Text>
              <Text style={[styles.accountSub, { color: theme.text2 }]}>Synced</Text>
              <Text style={[styles.accountSub, { color: theme.text3 }]}>
                Last sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'never'}
              </Text>
            </>
          ) : (
            <Pressable
              onPress={async () => {
                const user = await fxaService.signIn();
                if (user) {
                  setSyncUser(user);
                } else {
                  Alert.alert('Firefox sign-in not configured', 'OAuth credentials are not set yet.');
                }
              }}
            >
              <Text style={[styles.accountTitle, { color: theme.text }]}>Sign in to Firefox</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.grid}>
          {visibleTileOrder.map((id) => (
            <View key={id} style={styles.tileWrap}>
              {renderTile(id)}
              {isReorderMode ? (
                <View style={styles.reorderRow}>
                  <Pressable style={[styles.reorderButton, { backgroundColor: theme.surface2 }]} onPress={() => moveTile(id, -1)}>
                    <Text style={[styles.reorderLabel, { color: theme.text }]}>◀</Text>
                  </Pressable>
                  <Pressable style={[styles.reorderButton, { backgroundColor: theme.surface2 }]} onPress={() => moveTile(id, 1)}>
                    <Text style={[styles.reorderLabel, { color: theme.text }]}>▶</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
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
    backgroundColor: '#7d869f',
    marginBottom: 10,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    width: '48%',
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
  reorderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  reorderButton: {
    flex: 1,
    minHeight: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
