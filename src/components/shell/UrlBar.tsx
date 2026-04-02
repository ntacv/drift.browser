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
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetGesture } from '../../hooks/useGestures';
import { useI18n } from '../../i18n/useI18n';
import { getActiveTab, useBrowserStore } from '../../store/browserStore';
import type { HistoryEntry } from '../../store/types';
import { useTheme } from '../../theme';
import { normalizeInputToUrl, toDomain } from '../../hooks/useWebView';
import { TEXT_ON_COLORED_BACKGROUND } from '../../../default-settings';

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
  const isFullUrlVisible = useBrowserStore((state) => state.isFullUrlVisible);
  const defaultNewTabUrl = useBrowserStore((state) => state.defaultNewTabUrl);
  const urlOverlayOpenRequestId = useBrowserStore((state) => state.urlOverlayOpenRequestId);
  const urlOverlayCloseRequestId = useBrowserStore((state) => state.urlOverlayCloseRequestId);
  const createTab = useBrowserStore((state) => state.createTab);
  const navigateActiveTab = useBrowserStore((state) => state.navigateActiveTab);
  const goToNextTab = useBrowserStore((state) => state.goToNextTab);
  const goToPreviousTab = useBrowserStore((state) => state.goToPreviousTab);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const setUrlOverlayOpen = useBrowserStore((state) => state.setUrlOverlayOpen);
  const useWebsiteThemeColor = useBrowserStore((state) => state.useWebsiteThemeColor);
  const hideBarOnScroll = useBrowserStore((state) => state.hideBarOnScroll);
  const barPosition = useBrowserStore((state) => state.barPosition);

  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const lastHandledOverlayRequestId = useRef(urlOverlayOpenRequestId);
  const lastHandledCloseRequestId = useRef(urlOverlayCloseRequestId);
  const suppressNextPillPressRef = useRef(false);
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = useBrowserStore(getActiveTab);
  const workspace = workspaces[activeWorkspaceId];

  // Auto-hide animation: pixels the bar slides off-screen (larger than the bar's visual height)
  // Spacing between the bar pill and the screen edge
  const BAR_MARGIN = 12;
  const TOP_BAR_MARGIN = 4;
  // Extra buffer to guarantee the bar is fully off-screen when hidden.
  const BAR_HIDE_BUFFER = 48;
  const DEFAULT_HIDE_DISTANCE = 140;
  const barTranslate = useSharedValue(0);
  const hideDistanceValue = useSharedValue(DEFAULT_HIDE_DISTANCE);
  const toastAnimProgress = useSharedValue(0);
  const barHeightRef = useRef(0);
  const prevScrollYRef = useRef(0);
  const isBarHiddenRef = useRef(false);

  // BrowserScreen already applies top safe-area padding, so only a small visual gap is needed here.
  const topBarInset = TOP_BAR_MARGIN;
  const bottomBarInset = BAR_MARGIN + Math.max(insets.bottom, 4);

  // Reset bar visibility when switching tabs
  useEffect(() => {
    prevScrollYRef.current = 0;
    isBarHiddenRef.current = false;
    barTranslate.value = withTiming(0, { duration: 140 });
  }, [activeTab?.id, barTranslate]);

  // Hide/show bar based on scroll direction
  useEffect(() => {
    if (!hideBarOnScroll) {
      isBarHiddenRef.current = false;
      barTranslate.value = withTiming(0, { duration: 140 });
      return;
    }

    const current = activeTab?.scrollY ?? 0;
    const prev = prevScrollYRef.current;
    prevScrollYRef.current = current;

    if (current > prev + 5 && current > 60 && !isBarHiddenRef.current) {
      // Scrolling down – hide the bar
      const measuredHeight = barHeightRef.current > 0 ? barHeightRef.current : 56;
      const activeInset = barPosition === 'bottom' ? bottomBarInset : topBarInset;
      const hideDistance = measuredHeight + activeInset + BAR_HIDE_BUFFER;
      hideDistanceValue.value = hideDistance;
      const offset = barPosition === 'bottom' ? hideDistance : -hideDistance;
      isBarHiddenRef.current = true;
      barTranslate.value = withTiming(offset, { duration: 150 });
    } else if ((current < prev - 5 || current <= 10) && isBarHiddenRef.current) {
      // Scrolling up or near the top – show the bar with smooth, non-bouncy timing
      isBarHiddenRef.current = false;
      barTranslate.value = withTiming(0, { duration: 160 });
    }
  }, [activeTab?.scrollY, hideBarOnScroll, barPosition, barTranslate, bottomBarInset, topBarInset, hideDistanceValue]);

  // Always show the bar when the URL overlay is open
  useEffect(() => {
    if (isOverlayOpen) {
      isBarHiddenRef.current = false;
      barTranslate.value = withTiming(0, { duration: 140 });
    }
  }, [isOverlayOpen, barTranslate]);

  useEffect(() => () => {
    if (toastHideTimerRef.current) {
      clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }
  }, []);

  const barAnimatedStyle = useAnimatedStyle(() => {
    const absTranslate = Math.abs(barTranslate.value);
    const hideDistance = Math.max(hideDistanceValue.value, 1);
    const fadeStart = hideDistance * 0.82;
    return {
      transform: [{ translateY: barTranslate.value }],
      // Keep translate motion visible, then fade only near fully hidden state.
      opacity: interpolate(absTranslate, [0, fadeStart, hideDistance], [1, 1, 0], Extrapolation.CLAMP),
    };
  });

  const toastAnimatedStyle = useAnimatedStyle(() => {
    const direction = barPosition === 'bottom' ? -1 : 1;
    return {
      opacity: toastAnimProgress.value,
      transform: [
        { translateY: interpolate(toastAnimProgress.value, [0, 1], [0, 16 * direction], Extrapolation.CLAMP) },
        { scale: interpolate(toastAnimProgress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const barPositionStyle = barPosition === 'top'
    ? { top: topBarInset }
    : { bottom: bottomBarInset };

  const overlayHeight = Math.min(screenHeight * 0.78, screenHeight - insets.top - 20);
  const overlayGesture = useSheetGesture({
    isOpen: isOverlayOpen,
    sheetHeight: overlayHeight,
    closedOffset: 0,
    springConfig: {
      damping: 24,
      stiffness: 340,
      mass: 0.65,
    },
    onOpenChange: (isOpen) => {
      setOverlayOpen(isOpen);
      setUrlOverlayOpen(isOpen);
    },
  });

  useEffect(() => {
    if (urlOverlayOpenRequestId <= 0 || !activeTab || urlOverlayOpenRequestId === lastHandledOverlayRequestId.current) {
      return;
    }

    lastHandledOverlayRequestId.current = urlOverlayOpenRequestId;
    const shouldStartEmpty = activeTab.url === 'about:blank' && defaultNewTabUrl.trim().length === 0;
    setInput(shouldStartEmpty ? '' : activeTab.url);
    setOverlayOpen(true);
    setUrlOverlayOpen(true);
  }, [activeTab, defaultNewTabUrl, urlOverlayOpenRequestId, setUrlOverlayOpen]);

  useEffect(() => {
    if (urlOverlayCloseRequestId <= 0 || urlOverlayCloseRequestId === lastHandledCloseRequestId.current) {
      return;
    }

    lastHandledCloseRequestId.current = urlOverlayCloseRequestId;
    if (isOverlayOpen) {
      setOverlayOpen(false);
      setUrlOverlayOpen(false);
    }
  }, [urlOverlayCloseRequestId, isOverlayOpen, setUrlOverlayOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOverlayOpen) {
        inputRef.current?.focus();
      } else {
        inputRef.current?.blur();
        Keyboard.dismiss();
      }
    }, 35);

    return () => clearTimeout(timer);
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
    setUrlOverlayOpen(false);
  };

  const showCopyToast = () => {
    if (toastHideTimerRef.current) {
      clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }

    setShowCopiedToast(true);
    toastAnimProgress.value = 0;
    toastAnimProgress.value = withTiming(1, { duration: 180 });

    toastHideTimerRef.current = setTimeout(() => {
      toastAnimProgress.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(setShowCopiedToast)(false);
        }
      });
      toastHideTimerRef.current = null;
    }, 920);
  };

  const handleLongPressCopyUrl = async () => {
    if (!activeTab?.url) {
      return;
    }

    suppressNextPillPressRef.current = true;
    await Clipboard.setStringAsync(activeTab.url);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    showCopyToast();
  };

  const urlLabel = useMemo(() => {
    if (!activeTab) {
      return t('newTabLabel');
    }
    return isFullUrlVisible ? activeTab.url : toDomain(activeTab.url);
  }, [activeTab, isFullUrlVisible, t]);

  const urlBarBg =
    useWebsiteThemeColor && activeTab?.themeColor ? activeTab.themeColor : theme.surface;

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

  const controlOrder = isLeftHandMode
    ? (['workspace', 'menu', 'newTab'] as const)
    : (['newTab', 'menu', 'workspace'] as const);

  const controls = (
    <View style={styles.controlsGroup}>
      {controlOrder.map((controlId) => {
        if (controlId === 'newTab') {
          return (
            <Pressable key={controlId} onPress={() => createTab()} style={[styles.iconButton, { backgroundColor: theme.surface2 }]}>
              <Text style={[styles.iconText, { color: theme.text }]}>+</Text>
            </Pressable>
          );
        }

        if (controlId === 'menu') {
          return (
            <Pressable key={controlId} onPress={() => setMenuOpen(!isMenuOpen)} style={[styles.iconButton, { backgroundColor: theme.surface2 }]}>
              <Text style={[styles.iconText, styles.menuIconText, { color: theme.text }]}>⋯</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={controlId} onPress={() => setTrayOpen(!isTrayOpen)} style={[styles.iconButton, { backgroundColor: workspace?.color ?? theme.accent }]}>
            <Text style={[styles.iconText, { color: TEXT_ON_COLORED_BACKGROUND }]}>{workspace?.tabIds.length ?? 0}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <>
      <GestureDetector gesture={mainBarSwipeGesture}>
        <Animated.View
          onLayout={(event) => {
            barHeightRef.current = event.nativeEvent.layout.height;
          }}
          style={[
            styles.wrap,
            {
              backgroundColor: urlBarBg,
              borderColor: theme.border,
              ...barPositionStyle,
            },
            barAnimatedStyle,
          ]}
        >
          {isLeftHandMode ? controls : null}

          <Pressable
            onPress={() => {
              if (suppressNextPillPressRef.current) {
                suppressNextPillPressRef.current = false;
                return;
              }
              setInput(activeTab?.url ?? '');
              setOverlayOpen(true);
              setUrlOverlayOpen(true);
            }}
            onLongPress={() => {
              void handleLongPressCopyUrl();
            }}
            delayLongPress={280}
            style={[styles.pill, { backgroundColor: theme.surface2 }]}
          >
            <Text numberOfLines={1} style={[styles.domain, { color: theme.text }]}>
              {urlLabel}
            </Text>
          </Pressable>

          {!isLeftHandMode ? controls : null}
        </Animated.View>
      </GestureDetector>

      {showCopiedToast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.copyToast,
            barPosition === 'bottom'
              ? { bottom: bottomBarInset + 56 }
              : { top: topBarInset + 56 },
            { backgroundColor: theme.surface, borderColor: theme.border },
            toastAnimatedStyle,
          ]}
        >
          <Text style={[styles.copyToastText, { color: theme.text }]}>{t('copiedToClipboard')}</Text>
        </Animated.View>
      ) : null}

      {isOverlayOpen ? (
        <Pressable
          style={styles.overlayBackdrop}
          onPress={() => {
            setOverlayOpen(false);
            setUrlOverlayOpen(false);
          }}
        />
      ) : null}

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
              <Pressable
                onPress={() => {
                  setOverlayOpen(false);
                  setUrlOverlayOpen(false);
                }}
                style={styles.closeTapTarget}
              >
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
    borderWidth: 1,
    borderRadius: 100,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlsGroup: {
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
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_600SemiBold',
  },
  copyToast: {
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 40,
  },
  copyToastText: {
    fontSize: 12,
    fontWeight: '700',
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
    fontFamily: 'Inter_700Bold',
  },
  closeTapTarget: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
  },
  suggestionUrl: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
