import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBrowserStore } from '../../store/browserStore';
import type { Tab } from '../../store/types';
import { useTheme } from '../../theme';

interface TabCardProps {
  tab: Tab;
  isActive: boolean;
  workspaceColor: string;
  onPress: () => void;
  onClose: () => void;
}

export const TabCard = ({
  tab,
  isActive,
  workspaceColor,
  onPress,
  onClose,
}: TabCardProps) => {
  const { theme } = useTheme();
  const isLeftHandMode = useBrowserStore((state) => state.isLeftHandMode);

  const domain = useMemo(() => {
    try {
      return new URL(tab.url).hostname.replace(/^www\./, '');
    } catch {
      return tab.url;
    }
  }, [tab.url]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface2,
          borderColor: isActive ? workspaceColor : theme.border,
        },
      ]}
    >
      <View style={[styles.activeBar, { backgroundColor: isActive ? workspaceColor : 'transparent' }]} />
      <View style={styles.contentRow}>
        {isLeftHandMode ? (
          <Pressable
            onPress={() => {
              onClose();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
            }}
            style={[styles.closeButton, { backgroundColor: theme.danger }]}
          >
            <Text style={styles.closeLabel}>x</Text>
          </Pressable>
        ) : null}

        {tab.favicon ? (
          <Image source={{ uri: tab.favicon }} style={styles.favicon} />
        ) : (
          <View style={[styles.fallbackIcon, { backgroundColor: workspaceColor }]}>
            <Text style={styles.fallbackText}>{domain.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
              {tab.title || 'Untitled'}
            </Text>
            {tab.isPinned ? <Text style={[styles.pin, { color: theme.text2 }]}>PIN</Text> : null}
          </View>
          <Text numberOfLines={1} style={[styles.domain, { color: theme.text2 }]}>
            {domain}
          </Text>
        </View>

        {!isLeftHandMode ? (
          <Pressable
            onPress={() => {
              onClose();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
            }}
            style={[styles.closeButton, { backgroundColor: theme.danger }]}
          >
            <Text style={styles.closeLabel}>x</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  activeBar: {
    width: 3,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  favicon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  fallbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  pin: {
    fontSize: 10,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  domain: {
    fontSize: 11,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
