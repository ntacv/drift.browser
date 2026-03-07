import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetGesture } from '../../hooks/useGestures';
import { useI18n } from '../../i18n/useI18n';
import { getActiveTab, useBrowserStore } from '../../store/browserStore';
import type { HistoryEntry } from '../../store/types';
import { useTheme } from '../../theme';
import { normalizeInputToUrl, toDomain } from '../../hooks/useWebView';

const DISPLAYED_SUGGESTIONS_COUNT = 5;

export const UrlBar = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const activeWorkspaceId = useBrowserStore((state) => state.activeWorkspaceId);
  const workspaces = useBrowserStore((state) => state.workspaces);
  const history = useBrowserStore((state) => state.history);
  const searchEngine = useBrowserStore((state) => state.searchEngine);
  const isLeftHandMode = useBrowserStore((state) => state.isLeftHandMode);
  const defaultNewTabUrl = useBrowserStore((state) => state.defaultNewTabUrl);
  const urlOverlayOpenRequestId = useBrowserStore((state) => state.urlOverlayOpenRequestId);
  const createTab = useBrowserStore((state) => state.createTab);
  const navigateActiveTab = useBrowserStore((state) => state.navigateActiveTab);
  const goToNextTab = useBrowserStore((state) => state.goToNextTab);
  const goToPreviousTab = useBrowserStore((state) => state.goToPreviousTab);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);

  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput | null>(null);
  const lastHandledOverlayRequestId = useRef(0);

  const activeTab = useBrowserStore(getActiveTab);
  const workspace = workspaces[activeWorkspaceId];

  const overlayHeight = Math.min(screenHeight * 0.78, screenHeight - insets.top - 20);
  const overlayGesture = useSheetGesture({
    isOpen: isOverlayOpen,
    sheetHeight: overlayHeight,
    closedOffset: 0,
    onOpenChange: setOverlayOpen,
  });

  useEffect(() => {
    if (urlOverlayOpenRequestId <= 0 || !activeTab || urlOverlayOpenRequestId === lastHandledOverlayRequestId.current) {
      return;
    }

    lastHandledOverlayRequestId.current = urlOverlayOpenRequestId;
    const shouldStartEmpty = activeTab.url === 'about:blank' && defaultNewTabUrl.trim().length === 0;
    setInput(shouldStartEmpty ? '' : activeTab.url);
    setOverlayOpen(true);
  }, [activeTab, defaultNewTabUrl, urlOverlayOpenRequestId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOverlayOpen) {
        inputRef.current?.focus();
      } else {
        inputRef.current?.blur();
        Keyboard.dismiss();
      }
    }, 70);

    return () => clearTimeout(timer);
  }, [isOverlayOpen]);

  useEffect(() => {
    if (!isOverlayOpen) {
      return;
    }

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOverlayOpen(false);
      return true;
    });

    return () => sub.remove();
  }, [isOverlayOpen]);

  const suggestions = useMemo<HistoryEntry[]>(() => {
    const q = input.trim().toLowerCase();
    if (!q) {
      return history.slice(0, DISPLAYED_SUGGESTIONS_COUNT);
    }

    return history
      .filter((entry) => entry.url.toLowerCase().includes(q) || entry.title.toLowerCase().includes(q))
      .slice(0, DISPLAYED_SUGGESTIONS_COUNT);
  }, [history, input]);

  const submitInput = (value: string) => {
    const url = normalizeInputToUrl(value, searchEngine);
    if (!url) {
      return;
    }

    navigateActiveTab(url);
    setOverlayOpen(false);
  };

  const domain = activeTab ? toDomain(activeTab.url) : t('newTabLabel');

  const mainBarSwipeGesture = Gesture.Pan().onEnd((event) => {
    const absX = Math.abs(event.translationX);
    const absY = Math.abs(event.translationY);

    if (absX > absY) {
      if (event.translationX < -36 || event.velocityX < -260) {
        runOnJS(goToNextTab)();
        return;
      }

      if (event.translationX > 36 || event.velocityX > 260) {
        runOnJS(goToPreviousTab)();
      }
      return;
    }

    if (event.translationY < -40 || event.velocityY < -220) {
      runOnJS(setTrayOpen)(true);
    }
  });

  return (
    <>
      <GestureDetector gesture={mainBarSwipeGesture}>
        <View
          style={[
            styles.wrap,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              bottom: 12 + Math.max(insets.bottom, 4),
            },
          ]}
        >
          <Pressable onPress={() => createTab()} style={[styles.iconButton, { backgroundColor: theme.surface2 }]}>
            <Text style={[styles.iconText, { color: theme.text }]}>+</Text>
          </Pressable>

          {isLeftHandMode ? (
            <Pressable onPress={() => setMenuOpen(!isMenuOpen)} style={[styles.iconButton, { backgroundColor: theme.surface2 }]}>
              <Text style={[styles.iconText, styles.menuIconText, { color: theme.text }]}>⋯</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              setInput(activeTab?.url ?? '');
              setOverlayOpen(true);
            }}
            style={[styles.pill, { backgroundColor: theme.surface2 }]}
          >
            <Text numberOfLines={1} style={[styles.domain, { color: theme.text }]}>
              {domain}
            </Text>
          </Pressable>

          <Pressable onPress={() => setTrayOpen(!isTrayOpen)} style={[styles.iconButton, { backgroundColor: workspace?.color ?? theme.accent }]}>
            <Text style={[styles.iconText, { color: '#FFFFFF' }]}>{workspace?.tabIds.length ?? 0}</Text>
          </Pressable>

          {!isLeftHandMode ? (
            <Pressable onPress={() => setMenuOpen(!isMenuOpen)} style={[styles.iconButton, { backgroundColor: theme.surface2 }]}>
              <Text style={[styles.iconText, styles.menuIconText, { color: theme.text }]}>⋯</Text>
            </Pressable>
          ) : null}
        </View>
      </GestureDetector>

      {isOverlayOpen ? <Pressable style={styles.overlayBackdrop} onPress={() => setOverlayOpen(false)} /> : null}

      <GestureDetector gesture={overlayGesture.panGesture}>
        <Animated.View
          pointerEvents={isOverlayOpen ? 'auto' : 'none'}
          style={[
            styles.overlayCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 10),
              height: overlayHeight,
            },
            overlayGesture.animatedStyle,
          ]}
        >
          <View style={styles.dismissZone}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

            <View style={styles.overlayHeader}>
              <Text style={[styles.overlayTitle, { color: theme.text }]}>{t('address')}</Text>
              <Pressable onPress={() => setOverlayOpen(false)} style={styles.closeTapTarget}>
                <Text style={[styles.closeText, { color: theme.text2 }]}>{t('close')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              ref={(node) => {
                inputRef.current = node;
              }}
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface2 },
              ]}
              placeholder={t('searchOrEnterAddress')}
              placeholderTextColor={theme.text2}
              onSubmitEditing={(event) => submitInput(event.nativeEvent.text)}
            />

            {input.length > 0 ? (
              <Pressable onPress={() => setInput('')} style={styles.clearInputButton} hitSlop={8}>
                <Text style={[styles.clearInputText, { color: theme.text2 }]}>x</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.suggestionsList}>
            {suggestions.map((item) => (
              <Pressable
                key={item.id}
                style={styles.suggestionRow}
                onPress={() => {
                  setInput(item.url);
                  submitInput(item.url);
                }}
              >
                <Text numberOfLines={1} style={[styles.suggestionTitle, { color: theme.text }]}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={[styles.suggestionUrl, { color: theme.text2 }]}>
                  {item.url}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 12,
    borderWidth: 1,
    borderRadius: 100,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  menuIconText: {
    textAlign: 'center',
    minWidth: 16,
  },
  pill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 17,
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  domain: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 14,
  },
  overlayHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeTapTarget: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissZone: {
    paddingBottom: 2,
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 10,
  },
  inputWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingRight: 40,
  },
  clearInputButton: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearInputText: {
    fontSize: 20,
    lineHeight: 20,
  },
  suggestionsList: {
    paddingTop: 4,
  },
  suggestionRow: {
    paddingVertical: 10,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionUrl: {
    fontSize: 12,
    marginTop: 2,
  },
});
