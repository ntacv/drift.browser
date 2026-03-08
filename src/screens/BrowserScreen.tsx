import React, { useCallback, useEffect } from 'react';
import { BackHandler, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
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
}

export const BrowserScreen = ({ onOpenSettings }: BrowserScreenProps) => {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isFullscreen = useBrowserStore((state) => state.isFullscreen);
  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const isUrlOverlayOpen = useBrowserStore((state) => state.isUrlOverlayOpen);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const setFullscreen = useBrowserStore((state) => state.setFullscreen);
  const requestCloseUrlOverlay = useBrowserStore((state) => state.requestCloseUrlOverlay);
  const requestActiveTabNavigation = useBrowserStore((state) => state.requestActiveTabNavigation);
  const activeTab = useBrowserStore(getActiveTab);

  // Calculate orientation and determine if UI should be hidden
  const isLandscape = width > height;
  const shouldHideUI = isLandscape;

  useEffect(() => {
    if (isFullscreen && isTrayOpen) {
      setTrayOpen(false);
    }
  }, [isFullscreen, isTrayOpen, setTrayOpen]);

  // Fullscreen forces landscape; outside fullscreen we always allow free rotation.
  useEffect(() => {
    const applyOrientationPolicy = async () => {
      try {
        if (isFullscreen) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          return;
        }

        await ScreenOrientation.unlockAsync();
      } catch (error) {
        console.warn('Failed to set orientation lock:', error);
      }
    };

    applyOrientationPolicy();
  }, [isFullscreen]);

  const handleBackPress = useCallback(() => {
    // Priority 1: Exit fullscreen mode first.
    if (isFullscreen) {
      setFullscreen(false);
      return true;
    }

    // Priority 2: Close URL overlay if open
    if (isUrlOverlayOpen) {
      requestCloseUrlOverlay();
      return true;
    }

    // Priority 3: Close tab tray
    if (isTrayOpen) {
      setTrayOpen(false);
      return true;
    }

    // Priority 4: Close menu
    if (isMenuOpen) {
      setMenuOpen(false);
      return true;
    }

    // Priority 5: Navigate back in web history
    if (activeTab?.canGoBack) {
      requestActiveTabNavigation('back');
      return true;
    }

    // Let system handle (exit app or other default behavior)
    return false;
  }, [
    isFullscreen,
    isUrlOverlayOpen,
    isTrayOpen,
    isMenuOpen,
    activeTab,
    setFullscreen,
    requestCloseUrlOverlay,
    setTrayOpen,
    setMenuOpen,
    requestActiveTabNavigation,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={shouldHideUI ? ['left', 'right'] : ['top', 'left', 'right']}>
      <StatusBar hidden={shouldHideUI || isFullscreen} translucent backgroundColor="transparent" />
      <View style={styles.root}>
        <View style={styles.websiteLayer}>
          <BrowserView />
        </View>

        {!shouldHideUI && !isFullscreen ? <TabTray /> : null}
        {!shouldHideUI && !isFullscreen ? <MenuSheet onOpenSettings={onOpenSettings} /> : null}
        {!shouldHideUI && !isFullscreen ? <UrlBar /> : null}
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
