import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { faviconInjectionScript, parseWebViewBridgeMessage, pipRequestScript } from '../../hooks/useWebView';
import { useBrowserStore } from '../../store/browserStore';
import { useTheme } from '../../theme';

const TRACKER_HOSTS = new Set([
  'doubleclick.net',
  'www.google-analytics.com',
  'google-analytics.com',
  'connect.facebook.net',
  'facebook.net',
  'static.hotjar.com',
  'script.hotjar.com',
  'cdn.segment.com',
  'api.segment.io',
  'bat.bing.com',
  'snap.licdn.com',
  'ads.twitter.com',
  'analytics.tiktok.com',
  'stats.g.doubleclick.net',
  'googletagmanager.com',
  'www.googletagmanager.com',
  'adservice.google.com',
  'pixel.wp.com',
  'widget.intercom.io',
  'cdn.mxpnl.com',
]);

interface WebViewWrapperProps {
  tabId: string;
  visible: boolean;
}

const AnimatedMaterialIcon = Animated.createAnimatedComponent(MaterialIcons);

export const WebViewWrapper = ({ tabId, visible }: WebViewWrapperProps) => {
  const { mode, theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const lastScrollYRef = useRef<number | null>(null);
  const overscrollProgress = useRef(new Animated.Value(0)).current;
  const refreshSpin = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  const tab = useBrowserStore((state) => state.tabs[tabId]);
  const blockTrackers = useBrowserStore((state) => state.blockTrackers);
  const isUserFullscreen = useBrowserStore((state) => state.isUserFullscreen);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const updateTabMeta = useBrowserStore((state) => state.updateTabMeta);
  const addHistoryEntry = useBrowserStore((state) => state.addHistoryEntry);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const setUserFullscreen = useBrowserStore((state) => state.setUserFullscreen);

  useEffect(() => {
    if (!tab?.pendingNavAction) {
      return;
    }

    if (tab.pendingNavAction === 'back') {
      webViewRef.current?.goBack();
    } else if (tab.pendingNavAction === 'forward') {
      webViewRef.current?.goForward();
    } else {
      webViewRef.current?.reload();
    }

    updateTabMeta(tabId, { pendingNavAction: null });
  }, [tab?.pendingNavActionId, tab?.pendingNavAction, tabId, updateTabMeta]);

  useEffect(() => {
    if (!tab?.pendingPipRequestId) {
      return;
    }

    webViewRef.current?.injectJavaScript(pipRequestScript);
  }, [tab?.pendingPipRequestId]);

  if (!tab) {
    return null;
  }

  const isBlankPage = tab.url === 'about:blank';
  const blankHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>html,body{height:100%;margin:0;background:${theme.bg};color:${theme.text};}body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;}</style></head><body></body></html>`;

  const handleNavChange = (navState: WebViewNavigation) => {
    updateTabMeta(tabId, {
      title: navState.title || tab.title,
      url: navState.url,
      isLoading: navState.loading,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      // Clear stale theme color when a new page starts loading
      ...(navState.loading ? { themeColor: null } : {}),
    });

    if (!navState.loading) {
      addHistoryEntry({
        url: navState.url,
        title: navState.title || navState.url,
      });
    }
  };

  const hexToRgba = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const startRefreshSpin = () => {
    refreshSpin.setValue(0);
    Animated.loop(
      Animated.timing(refreshSpin, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRefreshSpin = () => {
    refreshSpin.stopAnimation();
    refreshSpin.setValue(0);
  };

  const translateY = overscrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 10],
  });

  const scale = overscrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const pullRotate = overscrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-80deg', '0deg'],
  });

  const spinRotate = refreshSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const opacity = overscrollProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  });

  const bubbleBackgroundOpacity = overscrollProgress.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.2, 0.2, 0.75],
  });

  return (
    <View style={styles.webview}>
      {showRefreshIndicator && (
        <Animated.View style={[styles.refreshIndicatorOverlay, { opacity }]}>
          <Animated.View
            style={[
              styles.refreshIndicatorBubble,
              {
                backgroundColor: bubbleBackgroundOpacity.interpolate({
                  inputRange: [0.2, 0.75],
                  outputRange: ['rgba(128, 128, 128, 0.2)', 'rgba(128, 128, 128, 0.75)'],
                }),
                transform: [
                  { translateY },
                  { scale },
                  { rotate: refreshing ? spinRotate : pullRotate },
                ],
              },
            ]}
          >
            <AnimatedMaterialIcon
              name="refresh"
              size={24}
              color={theme.text}
            />
          </Animated.View>
        </Animated.View>
      )}
      <WebView
        ref={webViewRef}
        source={isBlankPage ? { html: blankHtml } : { uri: tab.url }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        allowsProtectedMedia
        setSupportMultipleWindows={false}
        style={[styles.webview, !visible && styles.hidden, { backgroundColor: hexToRgba(theme.bg, 0.15) }]}
        onNavigationStateChange={handleNavChange}
        injectedJavaScriptBeforeContentLoaded={faviconInjectionScript}
        onMessage={(event) => {
          const message = parseWebViewBridgeMessage(event.nativeEvent.data);
          if (!message) {
            return;
          }

          if (message.type === 'favicon') {
            if (message.favicon) {
              updateTabMeta(tabId, { favicon: message.favicon });
            }
            return;
          }

          if (message.type === 'themeColor') {
            updateTabMeta(tabId, { themeColor: message.themeColor });
            return;
          }

          if (message.type === 'scrollY') {
            updateTabMeta(tabId, { scrollY: message.value });
            const previous = lastScrollYRef.current;
            lastScrollYRef.current = message.value;

            if (isTrayOpen && previous !== null && Math.abs(message.value - previous) > 3) {
              setTrayOpen(false);
            }
            return;
          }

          if (message.type === 'overscrollProgress') {
            setShowRefreshIndicator(true);
            Animated.timing(overscrollProgress, {
              toValue: message.value,
              duration: 0,
              useNativeDriver: true,
            }).start();
            return;
          }

          if (message.type === 'overscrollEnd') {
            Animated.timing(overscrollProgress, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              if (!refreshing) {
                setShowRefreshIndicator(false);
              }
            });
            return;
          }

          if (message.type === 'overscrollTop') {
            // Trigger haptic feedback on reload
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Exit fullscreen on overscroll, or reload if not in fullscreen
            if (isUserFullscreen) {
              setUserFullscreen(false);
            } else if (tab.webContentFullscreen) {
              updateTabMeta(tabId, { webContentFullscreen: false });
            } else {
              setRefreshing(true);
              startRefreshSpin();
              webViewRef.current?.reload();
              setTimeout(() => {
                stopRefreshSpin();
                setRefreshing(false);
                setShowRefreshIndicator(false);
              }, 1200);
            }
            return;
          }

          if (message.type === 'fullscreenEnter') {
            updateTabMeta(tabId, { webContentFullscreen: true });
            return;
          }

          if (message.type === 'fullscreenExit') {
            updateTabMeta(tabId, { webContentFullscreen: false });
          }

          if (message.type === 'pipEnter' || message.type === 'pipExit') {
            return;
          }

          if (message.type === 'pipError') {
            console.warn('[PiP]', message.message);
            return;
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (!blockTrackers) {
            return true;
          }

          try {
            const host = new URL(request.url).hostname;
            // TODO: This only blocks top-level navigations, not subresource requests.
            return !TRACKER_HOSTS.has(host);
          } catch {
            return true;
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webview: {
    ...StyleSheet.absoluteFillObject,
  },
  hidden: {
    opacity: 0,
    position: 'absolute',
    width: 0,
    height: 0,
  },
  refreshIndicatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  refreshIndicatorBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
