import React, { useCallback, useEffect } from 'react';
import { BackHandler, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';

import { BrowserView } from '../components/browser/BrowserView';
import { MenuSheet } from '../components/shell/MenuSheet';
import { TabTray } from '../components/shell/TabTray';
import { UrlBar } from '../components/shell/UrlBar';
import { getActiveTab, useBrowserStore } from '../store/browserStore';
import { useTheme } from '../theme';

interface BrowserScreenProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export const BrowserScreen = ({ onOpenSettings, onOpenHistory }: BrowserScreenProps) => {
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const isUserFullscreen = useBrowserStore((state) => state.isUserFullscreen);
  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const isUrlOverlayOpen = useBrowserStore((state) => state.isUrlOverlayOpen);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const setUserFullscreen = useBrowserStore((state) => state.setUserFullscreen);
  const requestCloseUrlOverlay = useBrowserStore((state) => state.requestCloseUrlOverlay);
  const requestActiveTabNavigation = useBrowserStore((state) => state.requestActiveTabNavigation);
  const updateTabMeta = useBrowserStore((state) => state.updateTabMeta);
  const linkActionPanel = useBrowserStore((state) => state.linkActionPanel);
  const setLinkActionPanel = useBrowserStore((state) => state.setLinkActionPanel);
  const activeTab = useBrowserStore(getActiveTab);
  const useWebsiteThemeColor = useBrowserStore((state) => state.useWebsiteThemeColor);

  // Calculate orientation and determine if UI should be hidden
  const isLandscape = width > height;
  const isWebContentFullscreen = activeTab?.webContentFullscreen ?? false;
  const shouldHideUI = isUserFullscreen || isWebContentFullscreen || isLandscape;

  // Use the website's theme color for the top safe zone when the feature is enabled
  const topSafeAreaBg =
    useWebsiteThemeColor && activeTab?.themeColor ? activeTab.themeColor : theme.bg;

  useEffect(() => {
    if (isUserFullscreen && isTrayOpen) {
      setTrayOpen(false);
    }
  }, [isUserFullscreen, isTrayOpen, setTrayOpen]);

  // Website fullscreen forces landscape; otherwise we always allow free rotation.
  useEffect(() => {
    const applyOrientationPolicy = async () => {
      try {
        if (isWebContentFullscreen) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          return;
        }

        await ScreenOrientation.unlockAsync();
      } catch (error) {
        console.warn('Failed to set orientation lock:', error);
      }
    };

    applyOrientationPolicy();
  }, [isWebContentFullscreen]);

  const handleBackPress = useCallback(() => {
    // Ignore hardware back while another screen (e.g. Settings) is on top.
    if (!isFocused) {
      return false;
    }

    // Priority 1: Exit user fullscreen mode first.
    if (isUserFullscreen) {
      setUserFullscreen(false);
      return true;
    }

    // Priority 2: Exit website fullscreen mode.
    if (isWebContentFullscreen && activeTab) {
      updateTabMeta(activeTab.id, { webContentFullscreen: false });
      return true;
    }

    // Priority 3: Close URL overlay if open
    if (isUrlOverlayOpen) {
      requestCloseUrlOverlay();
      return true;
    }

    // Priority 3.5: Close link action panel if open
    if (linkActionPanel) {
      setLinkActionPanel(null);
      return true;
    }

    // Priority 3.6: Close web error page if visible
    if (activeTab?.webError) {
      updateTabMeta(activeTab.id, { webError: null });
      return true;
    }

    // Priority 4: Close menu
    if (isMenuOpen) {
      setMenuOpen(false);
      return true;
    }

    // Priority 5: Close tab tray (workspace panel)
    if (isTrayOpen) {
      setTrayOpen(false);
      return true;
    }

    // Priority 6: Navigate back in web history
    if (activeTab?.canGoBack) {
      requestActiveTabNavigation('back');
      return true;
    }

    // Let system handle (exit app or other default behavior)
    return false;
  }, [
    isFocused,
    isUserFullscreen,
    isWebContentFullscreen,
    isUrlOverlayOpen,
    isTrayOpen,
    isMenuOpen,
    activeTab,
    setUserFullscreen,
    updateTabMeta,
    requestCloseUrlOverlay,
    linkActionPanel,
    setLinkActionPanel,
    setTrayOpen,
    setMenuOpen,
    requestActiveTabNavigation,
    onOpenHistory,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: topSafeAreaBg }]} edges={shouldHideUI ? ['left', 'right'] : ['top', 'left', 'right']}>
      <StatusBar hidden={shouldHideUI} translucent backgroundColor="transparent" />
      <View style={styles.root}>
        <View style={styles.websiteLayer}>
          <BrowserView />
        </View>

        {!shouldHideUI ? <TabTray /> : null}
        {!shouldHideUI ? <MenuSheet onOpenSettings={onOpenSettings} onOpenHistory={onOpenHistory} /> : null}
        {!shouldHideUI ? <UrlBar /> : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  root: {
    flex: 1,
    position: 'relative',
  },
  websiteLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
