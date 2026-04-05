import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../../i18n/useI18n';
import { useBrowserStore } from '../../store/browserStore';
import type { Tab } from '../../store/types';
import { useTheme } from '../../theme';
import { TEXT_ON_COLORED_BACKGROUND } from '../../../default-settings';

interface TabCardProps {
  tab: Tab;
  isActive: boolean;
  workspaceColor: string;
  onPress: () => void;
  onClose: () => void;
  onLongPress?: () => void;
}

export const TabCard = ({
  tab,
  isActive,
  workspaceColor,
  onPress,
  onClose,
  onLongPress,
}: TabCardProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLeftHandMode = useBrowserStore((state) => state.isLeftHandMode);
  const isCompactTabList = useBrowserStore((state) => state.isCompactTabList);
  const isFullUrlVisible = useBrowserStore((state) => state.isFullUrlVisible);

  const hostname = useMemo(() => {
    try {
      return new URL(tab.url).hostname.replace(/^www\./, '');
    } catch {
      return tab.url;
    }
  }, [tab.url]);

  const urlLabel = isFullUrlVisible ? tab.url : hostname;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        onLongPress?.();
      }}
      delayLongPress={400}
      style={[
        styles.card,
        isCompactTabList && styles.cardCompact,
        {
          backgroundColor: theme.surface2,
          borderColor: isActive ? workspaceColor : theme.border,
        },
      ]}
    >
      <View style={[styles.activeBar, { backgroundColor: isActive ? workspaceColor : 'transparent' }]} />
      <View style={[styles.contentRow, isCompactTabList && styles.contentRowCompact]}>
        {isLeftHandMode ? (
          <Pressable
            onPress={() => {
              onClose();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
            }}
            style={[
              styles.closeButton,
              isCompactTabList && styles.closeButtonCompact,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <MaterialIcons name="close" size={isCompactTabList ? 14 : 16} color={theme.text2} />
          </Pressable>
        ) : null}

        {tab.favicon ? (
          <Image source={{ uri: tab.favicon }} style={[styles.favicon, isCompactTabList && styles.faviconCompact]} />
        ) : (
          <View style={[styles.fallbackIcon, isCompactTabList && styles.fallbackIconCompact, { backgroundColor: workspaceColor }]}>
            <Text style={[styles.fallbackText, isCompactTabList && styles.fallbackTextCompact]}>{hostname.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.title, isCompactTabList && styles.titleCompact, { color: theme.text }]}>
              {tab.title === 'New Tab' ? t('newTabLabel') : tab.title || t('untitled')}
            </Text>
          </View>
          <Text numberOfLines={1} style={[styles.domain, isCompactTabList && styles.domainCompact, { color: theme.text2 }]}>
            {urlLabel}
          </Text>
        </View>

        {tab.isPinned ? (
          <View style={[styles.pinIconSlot, isCompactTabList && styles.pinIconSlotCompact]}>
            <MaterialIcons
              name="push-pin"
              size={isCompactTabList ? 12 : 14}
              color={theme.text2}
              style={styles.pinIcon}
            />
          </View>
        ) : null}

        {!isLeftHandMode ? (
          <Pressable
            onPress={() => {
              onClose();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
            }}
            style={[
              styles.closeButton,
              isCompactTabList && styles.closeButtonCompact,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <MaterialIcons name="close" size={isCompactTabList ? 14 : 16} color={theme.text2} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardCompact: {
    minHeight: 42,
    borderRadius: 10,
  },
  activeBar: {
    width: 3,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 10,
  },
  contentRowCompact: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  favicon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  faviconCompact: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  fallbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackIconCompact: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  fallbackText: {
    color: TEXT_ON_COLORED_BACKGROUND,
    fontWeight: '700',
    fontSize: 11,
  },
  fallbackTextCompact: {
    fontSize: 10,
  },
  pinIconSlot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIconSlotCompact: {
    width: 16,
    height: 16,
  },
  pinIcon: {
    textAlign: 'center',
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
  titleCompact: {
    fontSize: 12,
    marginBottom: 1,
  },
  domain: {
    fontSize: 11,
  },
  domainCompact: {
    fontSize: 10,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonCompact: {
    width: 24,
    height: 22,
    borderRadius: 6,
  },
});
