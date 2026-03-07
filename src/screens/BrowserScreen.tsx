import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrowserView } from '../components/browser/BrowserView';
import { MenuSheet } from '../components/shell/MenuSheet';
import { TabTray } from '../components/shell/TabTray';
import { UrlBar } from '../components/shell/UrlBar';
import { useBrowserStore } from '../store/browserStore';
import { useTheme } from '../theme';

interface BrowserScreenProps {
  onOpenSettings: () => void;
}

export const BrowserScreen = ({ onOpenSettings }: BrowserScreenProps) => {
  const { theme } = useTheme();
  const isFullscreen = useBrowserStore((state) => state.isFullscreen);
  const isMenuOpen = useBrowserStore((state) => state.isMenuOpen);
  const isTrayOpen = useBrowserStore((state) => state.isTrayOpen);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);

  useEffect(() => {
    if (isFullscreen && isTrayOpen) {
      setTrayOpen(false);
    }
  }, [isFullscreen, isTrayOpen, setTrayOpen]);

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
