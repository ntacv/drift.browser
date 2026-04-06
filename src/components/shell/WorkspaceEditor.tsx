import React, { useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { useI18n } from '../../i18n/useI18n';
import { useBrowserStore } from '../../store/browserStore';
import { useTheme } from '../../theme';
import type { Workspace } from '../../store/types';
import { TEXT_ON_COLORED_BACKGROUND } from '../../../default-settings';
import { AppAlertDialog } from '../common/AppAlertDialog';

interface WorkspaceEditorProps {
  visible: boolean;
  workspace: Workspace | null;
  onClose: () => void;
}

const ICON_OPTIONS: Array<{ name: keyof typeof MaterialIcons.glyphMap | null; label: string }> = [
  { name: null, label: 'None' },
  { name: 'home', label: 'Home' },
  { name: 'work', label: 'Work' },
  { name: 'science', label: 'Research' },
  { name: 'sports-esports', label: 'Gaming' },
  { name: 'menu-book', label: 'Books' },
  { name: 'palette', label: 'Art' },
  { name: 'music-note', label: 'Music' },
  { name: 'fitness-center', label: 'Fitness' },
  { name: 'restaurant', label: 'Food' },
  { name: 'flight', label: 'Travel' },
  { name: 'star', label: 'Star' },
  { name: 'lightbulb', label: 'Ideas' },
  { name: 'local-fire-department', label: 'Fire' },
  { name: 'favorite', label: 'Favorite' },
  { name: 'school', label: 'Education' },
  { name: 'shopping-cart', label: 'Shopping' },
];

const COLOR_OPTIONS = [
  '#E74C3C', '#C0392B', '#FF6B6B',
  '#E67E22', '#D35400', '#F39C12', '#FFA500',
  '#27AE60', '#2AB673', '#16A085', '#1ABC9C',
  '#3498DB', '#2980B9', '#4B8BFF', '#5965FF',
  '#8E44AD', '#9B59B6',
  '#95A5A6', '#7F8C8D', '#34495E',
];

export const WorkspaceEditor = ({ visible, workspace, onClose }: WorkspaceEditorProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const workspaceOrder = useBrowserStore((state) => state.workspaceOrder);
  const translateY = useRef(new Animated.Value(0)).current;

  const [label, setLabel] = useState(workspace?.label || '');
  const [emoji, setEmoji] = useState<string | null>(workspace?.emoji ?? 'home');
  const [color, setColor] = useState(workspace?.color || '#4B8BFF');
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showCannotRemoveDialog, setShowCannotRemoveDialog] = useState(false);

  React.useEffect(() => {
    if (workspace) {
      setLabel(workspace.label);
      setEmoji(workspace.emoji);
      setColor(workspace.color);
    }
  }, [workspace]);

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  const handleSave = () => {
    if (!workspace || !label.trim()) {
      return;
    }

    useBrowserStore.setState((state) => {
      const current = state.workspaces[workspace.id];
      if (!current) {
        return state;
      }

      return {
        workspaces: {
          ...state.workspaces,
          [workspace.id]: {
            ...current,
            label: label.trim(),
            emoji,
            color,
          },
        },
      };
    });

    onClose();
  };

  const handleCancel = () => {
    if (workspace) {
      setLabel(workspace.label);
      setEmoji(workspace.emoji);
      setColor(workspace.color);
    }
    onClose();
  };

  const handleRemove = () => {
    if (!workspace) {
      return;
    }

    // Check if this is the last workspace
    if (workspaceOrder.length <= 1) {
      setShowCannotRemoveDialog(true);
      return;
    }

    setShowRemoveDialog(true);
  };

  const workspaceId = workspace?.id ?? null;
  const currentIndex = workspaceId ? workspaceOrder.indexOf(workspaceId) : -1;
  const canMoveLeft = currentIndex > 0;
  const canMoveRight = currentIndex >= 0 && currentIndex < workspaceOrder.length - 1;

  const handleMoveWorkspace = (direction: 'left' | 'right') => {
    if (!workspaceId) {
      return;
    }

    useBrowserStore.setState((state) => {
      const fromIndex = state.workspaceOrder.indexOf(workspaceId);
      if (fromIndex < 0) {
        return state;
      }

      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= state.workspaceOrder.length) {
        return state;
      }

      const nextOrder = [...state.workspaceOrder];
      [nextOrder[fromIndex], nextOrder[toIndex]] = [nextOrder[toIndex], nextOrder[fromIndex]];

      return {
        workspaceOrder: nextOrder,
      };
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_evt, gestureState) => {
        translateY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 110) {
          Animated.timing(translateY, {
            toValue: 420,
            duration: 140,
            useNativeDriver: true,
          }).start(() => {
            handleCancel();
          });
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

  if (!workspace) {
    return null;
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
        <Pressable style={styles.backdrop} onPress={handleCancel}>
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                transform: [{ translateY }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
            {/* Header */}
            <View style={styles.header} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
              <Text style={[styles.title, { color: theme.text }]}>{t('editWorkspace')}</Text>
            </View>

            {/* Name Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text2 }]}>{t('workspaceName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
                value={label}
                onChangeText={setLabel}
                placeholder={t('workspaceNamePlaceholder')}
                placeholderTextColor={theme.text3}
                maxLength={20}
              />
            </View>

            {/* Icon Picker */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text2 }]}>{t('workspaceIcon')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconRow}
              >
                {ICON_OPTIONS.map((iconOption) => (
                  <Pressable
                    key={iconOption.name ?? 'none'}
                    style={[
                      styles.iconOption,
                      { backgroundColor: emoji === iconOption.name ? theme.surface2 : theme.bg, borderColor: theme.border },
                      emoji === iconOption.name && { borderColor: color, borderWidth: 2 },
                    ]}
                    onPress={() => setEmoji(iconOption.name)}
                  >
                    {iconOption.name ? (
                      <MaterialIcons name={iconOption.name} size={28} color={emoji === iconOption.name ? color : theme.text2} />
                    ) : (
                      <MaterialIcons name="block" size={28} color={emoji === iconOption.name ? color : theme.text3} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Color Picker */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text2 }]}>{t('workspaceColor')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorRow}
              >
                {COLOR_OPTIONS.map((colorOption) => (
                  <Pressable
                    key={colorOption}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorOption },
                      color === colorOption && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(colorOption)}
                  >
                    {color === colorOption && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Reorder */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.text2 }]}>{t('workspaceOrder')}</Text>
              <View style={styles.reorderRow}>
                <Pressable
                  style={[
                    styles.reorderButton,
                    { backgroundColor: theme.bg, borderColor: theme.border, opacity: canMoveLeft ? 1 : 0.4 },
                  ]}
                  onPress={() => handleMoveWorkspace('left')}
                  disabled={!canMoveLeft}
                >
                  <MaterialIcons name="chevron-left" size={20} color={theme.text} />
                  <Text style={[styles.reorderText, { color: theme.text }]}>{t('moveLeft')}</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.reorderButton,
                    { backgroundColor: theme.bg, borderColor: theme.border, opacity: canMoveRight ? 1 : 0.4 },
                  ]}
                  onPress={() => handleMoveWorkspace('right')}
                  disabled={!canMoveRight}
                >
                  <Text style={[styles.reorderText, { color: theme.text }]}>{t('moveRight')}</Text>
                  <MaterialIcons name="chevron-right" size={20} color={theme.text} />
                </Pressable>
              </View>
            </View>

            {/* Remove Workspace Button */}
            {workspaceOrder.length > 1 && (
              <View style={styles.section}>
                <Pressable
                  style={[styles.removeButton, { backgroundColor: theme.bg, borderColor: '#E74C3C' }]}
                  onPress={handleRemove}
                >
                  <MaterialIcons name="delete-outline" size={20} color="#E74C3C" />
                  <Text style={[styles.removeButtonText, { color: '#E74C3C' }]}>{t('removeWorkspace')}</Text>
                </Pressable>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.bg, borderColor: theme.border }]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.saveButton, { backgroundColor: color, opacity: !label.trim() ? 0.5 : 1 }]}
                onPress={handleSave}
                disabled={!label.trim()}
              >
                <Text style={[styles.buttonText, { color: TEXT_ON_COLORED_BACKGROUND }]}>{t('save')}</Text>
              </Pressable>
            </View>
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>

      <AppAlertDialog
        visible={showCannotRemoveDialog}
        title={t('removeWorkspace')}
        message={t('removeWorkspaceLastBlocked')}
        onRequestClose={() => setShowCannotRemoveDialog(false)}
        actions={[
          {
            id: 'ok',
            label: t('ok'),
            tone: 'accent',
          },
        ]}
      />

      <AppAlertDialog
        visible={showRemoveDialog}
        title={t('removeWorkspace')}
        message={t('removeWorkspaceConfirm')}
        onRequestClose={() => setShowRemoveDialog(false)}
        actions={[
          {
            id: 'cancel',
            label: t('cancel'),
          },
          {
            id: 'remove',
            label: t('removeWorkspace'),
            tone: 'destructive',
            onPress: () => {
              if (!workspace) {
                return;
              }
              useBrowserStore.getState().removeWorkspace(workspace.id);
              onClose();
            },
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollView: {
    width: '100%',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: TEXT_ON_COLORED_BACKGROUND,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  reorderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reorderButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  reorderText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  checkmark: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: TEXT_ON_COLORED_BACKGROUND,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  removeButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
