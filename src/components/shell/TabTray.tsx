import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetGesture } from '../../hooks/useGestures';
import { useI18n } from '../../i18n/useI18n';
import { useBrowserStore } from '../../store/browserStore';
import type { Tab } from '../../store/types';
import { useTheme } from '../../theme';
import { TabCard } from './TabCard';
import { TabContextMenu } from './TabContextMenu';
import { WorkspaceChips } from './WorkspaceChips';
import { SHEET_HANDLE_COLOR } from '../../../default-settings';

const TAB_LIST_HEIGHTS = {
  compact: 340,
  comfortable: 600,
} as const;

export const TabTray = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const tabListSize = useBrowserStore((state) => state.tabListSize);
  const isCompactTabList = useBrowserStore((state) => state.isCompactTabList);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const createTab = useBrowserStore((state) => state.createTab);
  const switchTab = useBrowserStore((state) => state.switchTab);
  const closeTab = useBrowserStore((state) => state.closeTab);
  const activeWorkspaceId = useBrowserStore((state) => state.activeWorkspaceId);
  const isAllTabsView = useBrowserStore((state) => state.isAllTabsView);
  const workspaceOrder = useBrowserStore((state) => state.workspaceOrder);
  const switchWorkspace = useBrowserStore((state) => state.switchWorkspace);
  const setAllTabsView = useBrowserStore((state) => state.setAllTabsView);
  const updateTabMeta = useBrowserStore((state) => state.updateTabMeta);
  const workspaces = useBrowserStore((state) => state.workspaces);
  const tabs = useBrowserStore((state) => state.tabs);
  const expandedHeight = Math.max(300, screenHeight - insets.top);
  const trayHeight = tabListSize === 'expanded' ? expandedHeight : TAB_LIST_HEIGHTS[tabListSize];
  const pinnedTileHeight = isCompactTabList ? 42 : 60;
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewportHeightRef = useRef(0);
  const tabLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const centerRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewNativeGestureRef = useRef(Gesture.Native());
  const lastLongPressedPinnedTabIdRef = useRef<string | null>(null);
  const [contextMenuTab, setContextMenuTab] = useState<Tab | null>(null);

  const workspace = workspaces[activeWorkspaceId];
  const allTabIds = useMemo(
    () => workspaceOrder.flatMap((workspaceId) => workspaces[workspaceId]?.tabIds ?? []),
    [workspaceOrder, workspaces],
  );
  const displayedTabIds = isAllTabsView ? allTabIds : (workspace?.tabIds ?? []);
  const pinnedTabs = useMemo(
    () =>
      allTabIds
        .map((tabId) => tabs[tabId])
        .filter((tab): tab is Tab => Boolean(tab) && tab.isPinned)
        .slice(0, 8),
    [allTabIds, tabs],
  );
  const activeTabId = workspace?.activeTabId ?? null;
  const gesture = useSheetGesture({
    isOpen: isTrayOpen,
    sheetHeight: trayHeight,
    closedOffset: 96,
    onOpenChange: setTrayOpen,
  });

  useEffect(() => {
    tabLayoutsRef.current = {};
  }, [activeWorkspaceId]);

  const centerActiveTab = useCallback(
    (attempt = 0) => {
      if (!isTrayOpen || !activeTabId || !scrollViewRef.current) {
        return;
      }

      const layout = tabLayoutsRef.current[activeTabId];
      const viewportHeight = scrollViewportHeightRef.current;
      if (!layout || viewportHeight <= 0) {
        if (attempt < 6) {
          if (centerRetryTimeoutRef.current) {
            clearTimeout(centerRetryTimeoutRef.current);
          }
          centerRetryTimeoutRef.current = setTimeout(() => centerActiveTab(attempt + 1), 60);
        }
        return;
      }

      const scrollY = Math.max(0, layout.y - (viewportHeight - layout.height) / 2);
      scrollViewRef.current.scrollTo({ y: scrollY, animated: true });
    },
    [activeTabId, isTrayOpen],
  );

  useEffect(() => {
    centerActiveTab(0);
    return () => {
      if (centerRetryTimeoutRef.current) {
        clearTimeout(centerRetryTimeoutRef.current);
        centerRetryTimeoutRef.current = null;
      }
    };
  }, [centerActiveTab, activeWorkspaceId, activeTabId, displayedTabIds.length, isAllTabsView]);

  const switchWorkspaceByOffset = (offset: 1 | -1) => {
    if (isAllTabsView) {
      return;
    }

    const currentIndex = workspaceOrder.indexOf(activeWorkspaceId);
    if (currentIndex < 0 || workspaceOrder.length === 0) {
      return;
    }

    const nextIndex = (currentIndex + offset + workspaceOrder.length) % workspaceOrder.length;
    const nextWorkspaceId = workspaceOrder[nextIndex];
    switchWorkspace(nextWorkspaceId);
  };

  const horizontalPanGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .simultaneousWithExternalGesture(scrollViewNativeGestureRef.current)
    .onEnd((event) => {
      if (event.translationX < -50 || event.velocityX < -260) {
        runOnJS(switchWorkspaceByOffset)(1);
        return;
      }

      if (event.translationX > 50 || event.velocityX > 260) {
        runOnJS(switchWorkspaceByOffset)(-1);
      }
    });

  const handlePinnedTabPress = (tabId: string) => {
    if (lastLongPressedPinnedTabIdRef.current === tabId) {
      lastLongPressedPinnedTabIdRef.current = null;
      return;
    }

    setAllTabsView(false);
    switchTab(tabId);
    setTrayOpen(false);
  };

  const handlePinnedTabLongPress = (tabId: string) => {
    lastLongPressedPinnedTabIdRef.current = tabId;
    updateTabMeta(tabId, { isPinned: false });
  };

  if (!workspace) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={isTrayOpen ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          height: trayHeight,
        },
        gesture.animatedStyle,
      ]}
    >
      <GestureDetector gesture={gesture.panGesture}>
        <View>
          <View style={styles.handleTouchArea}>
            <View style={styles.handle} />
          </View>
          <View style={styles.headerRow}>
            <WorkspaceChips />
          </View>
        </View>
      </GestureDetector>

      <GestureDetector gesture={horizontalPanGesture}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.listScroll}
          showsVerticalScrollIndicator
          onLayout={(event) => {
            scrollViewportHeightRef.current = event.nativeEvent.layout.height;
            centerActiveTab(0);
          }}
          onContentSizeChange={() => {
            centerActiveTab(0);
          }}
          contentContainerStyle={[
            styles.cardsColumn,
            isCompactTabList && styles.cardsColumnCompact,
            {
              paddingBottom: Math.max(insets.bottom, 10) + 90,
              gap: isCompactTabList ? 4 : 6,
            },
          ]}
        >
          {pinnedTabs.length > 0 ? (
            <View style={styles.pinnedGrid}>
              {pinnedTabs.map((pinnedTab) => (
                <View key={`pinned-${pinnedTab.id}`} style={styles.pinnedTileWrap}>
                  <Pressable
                    onPress={() => handlePinnedTabPress(pinnedTab.id)}
                    onLongPress={() => handlePinnedTabLongPress(pinnedTab.id)}
                    delayLongPress={320}
                    style={({ pressed }) => [
                      styles.pinnedTile,
                      { height: pinnedTileHeight },
                      { borderColor: theme.border, backgroundColor: theme.surface2 },
                      activeTabId === pinnedTab.id && { borderColor: workspaces[pinnedTab.workspaceId]?.color ?? theme.accent },
                      pressed && { opacity: 0.72 },
                    ]}
                  >
                    {pinnedTab.favicon ? (
                      <Image source={{ uri: pinnedTab.favicon }} style={styles.pinnedFavicon} />
                    ) : (
                      <MaterialIcons name="language" size={20} color={theme.text2} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={() => createTab()}
            style={[styles.newCard, isCompactTabList && styles.newCardCompact, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
          >
            <Text style={[styles.newCardText, isCompactTabList && styles.newCardTextCompact, { color: theme.text }]}>+ {t('newTabLabel')}</Text>
          </Pressable>
          {displayedTabIds.map((tabId) => {
            const tab = tabs[tabId];
            if (!tab) {
              return null;
            }

            const tabWorkspaceColor = workspaces[tab.workspaceId]?.color ?? workspace.color;

            return (
              <View
                key={tab.id}
                onLayout={(event) => {
                  tabLayoutsRef.current[tab.id] = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <TabCard
                  tab={tab}
                  workspaceColor={tabWorkspaceColor}
                  isActive={activeTabId === tab.id}
                  onPress={() => {
                    setAllTabsView(false);
                    switchTab(tab.id);
                    setTrayOpen(false);
                  }}
                  onClose={() => closeTab(tab.id)}
                  onLongPress={() => setContextMenuTab(tab)}
                />
              </View>
            );
          })}
        </ScrollView>
      </GestureDetector>
      <TabContextMenu
        visible={contextMenuTab !== null}
        tab={contextMenuTab}
        onClose={() => setContextMenuTab(null)}
      />
    </Animated.View>
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
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: SHEET_HANDLE_COLOR,
    alignSelf: 'center',
  },
  handleTouchArea: {
    paddingVertical: 8,
  },
  headerRow: {
    marginBottom: 10,
  },
  cardsColumn: {
    paddingVertical: 6,
    paddingBottom: 24,
  },
  cardsColumnCompact: {
    paddingVertical: 4,
  },
  listScroll: {
    flex: 1,
  },
  pinnedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pinnedTileWrap: {
    width: '25%',
    paddingHorizontal: 3,
    paddingBottom: 6,
  },
  pinnedTile: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedFavicon: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  newCard: {
    minHeight: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCardCompact: {
    minHeight: 44,
    borderRadius: 10,
    marginBottom: 4,
  },
  newCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  newCardTextCompact: {
    fontSize: 12,
  },
});
