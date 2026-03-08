import React, { useCallback, useEffect } from 'react';
import { BackHandler, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const isFullscreen = useBrowserStore((state) => state.isFullscreen);
  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const isUrlOverlayOpen = useBrowserStore((state) => state.isUrlOverlayOpen);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const setMenuOpen = useBrowserStore((state) => state.setMenuOpen);
  const requestCloseUrlOverlay = useBrowserStore((state) => state.requestCloseUrlOverlay);
  const requestActiveTabNavigation = useBrowserStore((state) => state.requestActiveTabNavigation);
  const activeTab = useBrowserStore(getActiveTab);

  useEffect(() => {
    if (isFullscreen && isTrayOpen) {
      setTrayOpen(false);
    }
  }, [isFullscreen, isTrayOpen, setTrayOpen]);

  const handleBackPress = useCallback(() => {
    // Priority 1: Close URL overlay if open
    if (isUrlOverlayOpen) {
      requestCloseUrlOverlay();
      return true;
    }

    // Priority 2: Close tab tray
    if (isTrayOpen) {
      setTrayOpen(false);
      return true;
    }

    // Priority 3: Close menu
    if (isMenuOpen) {
      setMenuOpen(false);
      return true;
    }

    // Priority 4: Navigate back in web history
    if (activeTab?.canGoBack) {
      requestActiveTabNavigation('back');
      return true;
    }

    // Let system handle (exit app or other default behavior)
    return false;
  }, [isUrlOverlayOpen, isTrayOpen, isMenuOpen, activeTab, requestCloseUrlOverlay, setTrayOpen, setMenuOpen, requestActiveTabNavigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={isFullscreen ? ['left', 'right'] : ['top', 'left', 'right']}>
      <StatusBar hidden={isFullscreen} translucent backgroundColor="transparent" />
      <View style={styles.root}>
        <View style={styles.websiteLayer}>
          <BrowserView />
        </View>

        {!isFullscreen ? <TabTray /> : null}
        {!isFullscreen || isMenuOpen ? <MenuSheet onOpenSettings={onOpenSettings} /> : null}
        {!isFullscreen ? <UrlBar /> : null}
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
