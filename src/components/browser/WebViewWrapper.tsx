import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { faviconInjectionScript, parseWebViewBridgeMessage } from '../../hooks/useWebView';
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

export const WebViewWrapper = ({ tabId, visible }: WebViewWrapperProps) => {
  const { mode, theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const lastScrollYRef = useRef<number | null>(null);
  const tab = useBrowserStore((state) => state.tabs[tabId]);
  const blockTrackers = useBrowserStore((state) => state.blockTrackers);
  const isFullscreen = useBrowserStore((state) => state.isFullscreen);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const updateTabMeta = useBrowserStore((state) => state.updateTabMeta);
  const addHistoryEntry = useBrowserStore((state) => state.addHistoryEntry);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const setFullscreen = useBrowserStore((state) => state.setFullscreen);

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

  if (!tab) {
    return null;
  }

  const isBlankPage = tab.url === 'about:blank';
  const blankHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>html,body{height:100%;margin:0;background:${mode === 'dark' ? '#0d0f14' : '#f4f6fb'};color:${mode === 'dark' ? '#e8eaf2' : '#151a2a'};}body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;}</style></head><body></body></html>`;

  const handleNavChange = (navState: WebViewNavigation) => {
    updateTabMeta(tabId, {
      title: navState.title || tab.title,
      url: navState.url,
      isLoading: navState.loading,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
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

  return (
    <WebView
      ref={webViewRef}
      source={isBlankPage ? { html: blankHtml } : { uri: tab.url }}
      originWhitelist={['*']}
      style={[styles.webview, !visible && styles.hidden, { backgroundColor: hexToRgba(theme.bg, 0.15) }]}
      onNavigationStateChange={handleNavChange}
      injectedJavaScript={faviconInjectionScript}
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

        if (message.type === 'scrollY') {
          updateTabMeta(tabId, { scrollY: message.value });
          const previous = lastScrollYRef.current;
          lastScrollYRef.current = message.value;

          if (isTrayOpen && previous !== null && Math.abs(message.value - previous) > 3) {
            setTrayOpen(false);
          }
          return;
        }

        if (message.type === 'overscrollTop') {
          if (isFullscreen) {
            setFullscreen(false);
          } else {
            webViewRef.current?.reload();
          }
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
});
