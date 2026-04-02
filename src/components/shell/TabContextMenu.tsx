import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '../../i18n/useI18n';
import { useBrowserStore } from '../../store/browserStore';
import type { Tab } from '../../store/types';
import { useTheme } from '../../theme';

interface TabContextMenuProps {
  visible: boolean;
  tab: Tab | null;
  onClose: () => void;
}

export const TabContextMenu = ({ visible, tab, onClose }: TabContextMenuProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const workspaces = useBrowserStore((state) => state.workspaces);
  const workspaceOrder = useBrowserStore((state) => state.workspaceOrder);
  const duplicateTab = useBrowserStore((state) => state.duplicateTab);
  const moveTabToWorkspace = useBrowserStore((state) => state.moveTabToWorkspace);
  const updateTabMeta = useBrowserStore((state) => state.updateTabMeta);
  const closeTab = useBrowserStore((state) => state.closeTab);

  const translateY = useRef(new Animated.Value(0)).current;
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      setShowWorkspacePicker(false);
      setCopiedFeedback(null);
    }
  }, [translateY, visible]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: 600,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_evt, gs) => {
        translateY.setValue(Math.max(0, gs.dy));
      },
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          dismiss();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }).start();
      },
    }),
  ).current;

  if (!tab) {
    return null;
  }

  const handleDuplicateTab = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    duplicateTab(tab.id);
    onClose();
  };

  const handleCopyUrl = async () => {
    await Clipboard.setStringAsync(tab.url);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setCopiedFeedback('url');
    setTimeout(onClose, 600);
  };

  const handleCopyTitle = async () => {
    await Clipboard.setStringAsync(tab.title || tab.url);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setCopiedFeedback('title');
    setTimeout(onClose, 600);
  };

  const handleTogglePin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    updateTabMeta(tab.id, { isPinned: !tab.isPinned });
    onClose();
  };

  const handleCloseTab = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    closeTab(tab.id);
    onClose();
  };

  const handleMoveToWorkspace = (targetWorkspaceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    moveTabToWorkspace(tab.id, targetWorkspaceId);
    onClose();
  };

  const otherWorkspaces = workspaceOrder
    .map((id) => workspaces[id])
    .filter((ws) => ws && ws.id !== tab.workspaceId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              transform: [{ translateY }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Drag handle */}
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: theme.text3 }]} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Tab preview header */}
            <View style={[styles.tabPreview, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
              <View style={[styles.accentBar, { backgroundColor: workspaces[tab.workspaceId]?.color ?? theme.accent }]} />
              <View style={styles.previewContent}>
                <Text numberOfLines={1} style={[styles.previewTitle, { color: theme.text }]}>
                  {tab.title === 'New Tab' ? t('newTabLabel') : tab.title || t('untitled')}
                </Text>
                <Text numberOfLines={1} style={[styles.previewUrl, { color: theme.text2 }]}>
                  {tab.url}
                </Text>
              </View>
            </View>

            {/* Move to workspace */}
            {otherWorkspaces.length > 0 && (
              <>
                <MenuRow
                  icon="drive-file-move"
                  label={t('moveToWorkspace')}
                  theme={theme}
                  trailingIcon={showWorkspacePicker ? 'expand-less' : 'expand-more'}
                  onPress={() => setShowWorkspacePicker((v) => !v)}
                />
                {showWorkspacePicker && (
                  <View style={[styles.workspaceList, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                    {otherWorkspaces.map((ws) => (
                      <Pressable
                        key={ws.id}
                        style={({ pressed }) => [
                          styles.workspaceItem,
                          { borderBottomColor: theme.border },
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => handleMoveToWorkspace(ws.id)}
                      >
                        <View style={[styles.workspaceDot, { backgroundColor: ws.color }]} />
                        <Text style={[styles.workspaceLabel, { color: theme.text }]}>{ws.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Duplicate */}
            <MenuRow
              icon="content-copy"
              label={t('duplicateTab')}
              theme={theme}
              onPress={handleDuplicateTab}
            />

            {/* Copy URL */}
            <MenuRow
              icon="link"
              label={copiedFeedback === 'url' ? t('copiedToClipboard') : t('copyUrl')}
              theme={theme}
              onPress={handleCopyUrl}
            />

            {/* Copy Title */}
            <MenuRow
              icon="title"
              label={copiedFeedback === 'title' ? t('copiedToClipboard') : t('copyTitle')}
              theme={theme}
              onPress={handleCopyTitle}
            />

            {/* Pin / Unpin */}
            <MenuRow
              icon="push-pin"
              label={tab.isPinned ? t('unpinTab') : t('pinTab')}
              theme={theme}
              iconColor={tab.isPinned ? theme.accent : undefined}
              onPress={handleTogglePin}
            />

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Close tab */}
            <MenuRow
              icon="close"
              label={t('closeTab')}
              theme={theme}
              destructive
              onPress={handleCloseTab}
            />
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

interface MenuRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  theme: ReturnType<typeof import('../../theme').useTheme>['theme'];
  trailingIcon?: keyof typeof MaterialIcons.glyphMap;
  destructive?: boolean;
  iconColor?: string;
  onPress: () => void;
}

const MenuRow = ({ icon, label, theme, trailingIcon, destructive, iconColor, onPress }: MenuRowProps) => {
  const color = destructive ? theme.danger : theme.text;
  const resolvedIconColor = iconColor ?? color;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { borderBottomColor: theme.border },
        pressed && { opacity: 0.65 },
      ]}
    >
      <MaterialIcons name={icon} size={20} color={resolvedIconColor} style={styles.menuIcon} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {trailingIcon ? (
        <MaterialIcons name={trailingIcon} size={18} color={theme.text2} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  handleArea: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  tabPreview: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  accentBar: {
    width: 3,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewUrl: {
    fontSize: 11,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: -14,
  },
  workspaceList: {
    marginTop: -1,
    marginBottom: 2,
    marginHorizontal: 38,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  workspaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  workspaceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  workspaceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
