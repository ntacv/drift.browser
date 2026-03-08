import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetGesture } from '../../hooks/useGestures';
import { useBrowserStore } from '../../store/browserStore';
import { useTheme } from '../../theme';
import { TabCard } from './TabCard';
import { WorkspaceChips } from './WorkspaceChips';

const TAB_LIST_HEIGHTS = {
  compact: 340,
  comfortable: 600,
} as const;

export const TabTray = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const tabListSize = useBrowserStore((state) => state.tabListSize);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const createTab = useBrowserStore((state) => state.createTab);
  const switchTab = useBrowserStore((state) => state.switchTab);
  const closeTab = useBrowserStore((state) => state.closeTab);
  const activeWorkspaceId = useBrowserStore((state) => state.activeWorkspaceId);
  const workspaceOrder = useBrowserStore((state) => state.workspaceOrder);
  const switchWorkspace = useBrowserStore((state) => state.switchWorkspace);
  const workspaces = useBrowserStore((state) => state.workspaces);
  const tabs = useBrowserStore((state) => state.tabs);
  const expandedHeight = Math.max(300, screenHeight - insets.top);
  const trayHeight = tabListSize === 'expanded' ? expandedHeight : TAB_LIST_HEIGHTS[tabListSize];
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewportHeightRef = useRef(0);
  const tabLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const centerRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workspace = workspaces[activeWorkspaceId];
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
      if (!isTrayOpen || !workspace?.activeTabId || !scrollViewRef.current) {
        return;
      }

      const layout = tabLayoutsRef.current[workspace.activeTabId];
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
    [isTrayOpen, workspace],
  );

  useEffect(() => {
    centerActiveTab(0);
    return () => {
      if (centerRetryTimeoutRef.current) {
        clearTimeout(centerRetryTimeoutRef.current);
        centerRetryTimeoutRef.current = null;
      }
    };
  }, [centerActiveTab, activeWorkspaceId, workspace?.activeTabId, workspace?.tabIds.length]);

  const switchWorkspaceByOffset = (offset: 1 | -1) => {
    const currentIndex = workspaceOrder.indexOf(activeWorkspaceId);
    if (currentIndex < 0 || workspaceOrder.length === 0) {
      return;
    }

    const nextIndex = (currentIndex + offset + workspaceOrder.length) % workspaceOrder.length;
    const nextWorkspaceId = workspaceOrder[nextIndex];
    switchWorkspace(nextWorkspaceId);
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
            <Text style={[styles.count, { color: theme.text2 }]}>{workspace.tabIds.length} tabs</Text>
          </View>
        </View>
      </GestureDetector>

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
          {
            paddingBottom: Math.max(insets.bottom, 10) + 90,
          },
        ]}
      >
          <Pressable
            onPress={() => createTab()}
            style={[styles.newCard, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
          >
            <Text style={[styles.newCardText, { color: theme.text }]}>+ New Tab</Text>
          </Pressable>
          {workspace.tabIds.map((tabId) => {
            const tab = tabs[tabId];
            if (!tab) {
              return null;
            }
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
                  workspaceColor={workspace.color}
                  isActive={workspace.activeTabId === tab.id}
                  onSwipeLeft={() => switchWorkspaceByOffset(1)}
                  onSwipeRight={() => switchWorkspaceByOffset(-1)}
                  onPress={() => {
                    switchTab(tab.id);
                    setTrayOpen(false);
                  }}
                  onClose={() => closeTab(tab.id)}
                />
              </View>
            );
          })}
        </ScrollView>
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
    backgroundColor: '#7d869f',
    alignSelf: 'center',
  },
  handleTouchArea: {
    paddingVertical: 8,
  },
  headerRow: {
    marginBottom: 10,
  },
  count: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  cardsColumn: {
    paddingVertical: 6,
    paddingBottom: 24,
  },
  listScroll: {
    flex: 1,
  },
  newCard: {
    minHeight: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  newCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
