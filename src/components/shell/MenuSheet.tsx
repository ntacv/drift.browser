import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetGesture } from '../../hooks/useGestures';
import { useBrowserStore, getActiveTab } from '../../store/browserStore';
import { useTheme } from '../../theme';
import * as fxaService from '../../services/fxaService';

const SHEET_HEIGHT = 360;

interface MenuSheetProps {
  onOpenSettings: () => void;
}

type MenuTileId =
  | 'share'
  | 'settings'
  | 'workspace'
  | 'fullscreen'
  | 'signout';

const DEFAULT_TILE_ORDER: MenuTileId[] = [
  'share',
  'settings',
  'workspace',
  'fullscreen',
  'signout',
];

export const MenuSheet = ({ onOpenSettings }: MenuSheetProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [draggedTile, setDraggedTile] = useState<MenuTileId | null>(null);

  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const syncUser = useBrowserStore((state) => state.syncUser);
  const lastSyncedAt = useBrowserStore((state) => state.lastSyncedAt);
  const setSyncUser = useBrowserStore((state) => state.setSyncUser);
  const menuTileOrder = useBrowserStore((state) => state.menuTileOrder);
  const setMenuTileOrder = useBrowserStore((state) => state.setMenuTileOrder);
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

  const executeTileAction = (id: MenuTileId) => {
    if (id === 'share') {
      Alert.alert('Share', activeTab?.url ?? 'No active tab');
    } else if (id === 'settings') {
      setMenuOpen(false);
      onOpenSettings();
    } else if (id === 'workspace') {
      createWorkspace('New Workspace', '✨', '#7E57C2');
      setMenuOpen(false);
    } else if (id === 'fullscreen') {
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
    } else if (id === 'signout') {
      fxaService.signOut().then(() => setSyncUser(null));
    }
  };

  const renderTile = (id: MenuTileId, index: number) => {
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
          <Text style={[styles.actionText, { color: theme.text }]}>Share URL</Text>
        </Pressable>
      );
    }

    if (id === 'settings') {
      return (
        <Pressable key={id} {...baseProps}>
          <MaterialIcons name="settings" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>Settings</Text>
        </Pressable>
      );
    }

    if (id === 'workspace') {
      return (
        <Pressable key={id} {...baseProps}>
          <MaterialIcons name="workspaces-outline" size={18} color={theme.text} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: theme.text }]}>New Workspace</Text>
        </Pressable>
      );
    }

    if (id === 'fullscreen') {
      return (
        <Pressable key={id} {...baseProps}>
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

    return (
      <Pressable key={id} {...baseProps}>
        <MaterialIcons name="logout" size={18} color={theme.danger} style={styles.actionIcon} />
        <Text style={[styles.actionText, { color: theme.danger }]}>Sign Out</Text>
      </Pressable>
    );
  };

  const DraggableTile = ({ id, index }: { id: MenuTileId; index: number }) => {
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
        <Animated.View style={[styles.tileWrap, animatedStyle]}>
          {renderTile(id, index)}
          {isDragging && (
            <View style={styles.dragHint}>
              <Text style={[styles.dragHintText, { color: theme.text2 }]}>Tap another tile to swap</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
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
            {visibleTileOrder.map((id, index) => (
              <DraggableTile key={id} id={id} index={index} />
            ))}
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
    backgroundColor: '#7d869f',
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
