import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ALL_TABS_WORKSPACE_COLOR, TEXT_ON_COLORED_BACKGROUND } from '../../../default-settings';
import { useI18n } from '../../i18n/useI18n';
import { useBrowserStore } from '../../store/browserStore';
import { useTheme } from '../../theme';
import type { Workspace } from '../../store/types';
import { WorkspaceEditor } from './WorkspaceEditor';

const LEGACY_WORKSPACE_ICON_MAP: Record<string, string> = {
  '🏠': 'home',
  '💼': 'work',
  '🔬': 'science',
  '✨': 'star',
};

const getValidWorkspaceIcon = (icon: string | null): keyof typeof MaterialIcons.glyphMap | null => {
  if (!icon) {
    return null;
  }
  const mapped = LEGACY_WORKSPACE_ICON_MAP[icon] ?? icon;
  if (Object.prototype.hasOwnProperty.call(MaterialIcons.glyphMap, mapped)) {
    return mapped as keyof typeof MaterialIcons.glyphMap;
  }
  return null;
};

export const WorkspaceChips = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const workspaceOrder = useBrowserStore((state) => state.workspaceOrder);
  const workspaces = useBrowserStore((state) => state.workspaces);
  const activeWorkspaceId = useBrowserStore((state) => state.activeWorkspaceId);
  const isAllTabsView = useBrowserStore((state) => state.isAllTabsView);
  const switchWorkspace = useBrowserStore((state) => state.switchWorkspace);
  const setTrayOpen = useBrowserStore((state) => state.setTrayOpen);
  const setAllTabsView = useBrowserStore((state) => state.setAllTabsView);
  const closeAllTabs = useBrowserStore((state) => state.closeAllTabs);
  const saveAllTabsAsWorkspace = useBrowserStore((state) => state.saveAllTabsAsWorkspace);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const handleLongPress = (workspace: Workspace) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setEditingWorkspace(workspace);
    setEditorVisible(true);
  };

  const totalTabCount = workspaceOrder.reduce((sum, workspaceId) => {
    const workspace = workspaces[workspaceId];
    return sum + (workspace?.tabIds.length ?? 0);
  }, 0);

  const handleAllTabsLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    Alert.alert(t('allTabs'), undefined, [
      {
        text: t('closeAllTabs'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('closeAllTabs'), t('closeAllTabsConfirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('closeAllTabs'),
              style: 'destructive',
              onPress: () => closeAllTabs(),
            },
          ]);
        },
      },
      {
        text: t('saveAllTabsAsWorkspace'),
        onPress: () => saveAllTabsAsWorkspace(t('allTabs')),
      },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  return (
    <>
      <View style={styles.row}>
        {workspaceOrder.map((workspaceId) => {
          const workspace = workspaces[workspaceId];
          if (!workspace) {
            return null;
          }

          const isActive = !isAllTabsView && workspaceId === activeWorkspaceId;
          const iconName = getValidWorkspaceIcon(workspace.emoji);
          return (
            <Pressable
              key={workspaceId}
              onPress={() => {
                setAllTabsView(false);
                switchWorkspace(workspaceId);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              }}
              onLongPress={() => handleLongPress(workspace)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? workspace.color : theme.surface2,
                  borderColor: isActive ? workspace.color : theme.border,
                },
                !iconName && styles.chipNoIcon,
              ]}
            >
              {iconName && (
                <MaterialIcons
                  name={iconName}
                  size={18}
                  color={isActive ? TEXT_ON_COLORED_BACKGROUND : theme.text}
                />
              )}
              <Text style={[styles.label, { color: isActive ? TEXT_ON_COLORED_BACKGROUND : theme.text }]}>{workspace.label}</Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => {
            setAllTabsView(true);
            setTrayOpen(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          }}
          onLongPress={handleAllTabsLongPress}
          style={[
            styles.chip,
            {
              backgroundColor: isAllTabsView ? ALL_TABS_WORKSPACE_COLOR : theme.surface2,
              borderColor: isAllTabsView ? ALL_TABS_WORKSPACE_COLOR : theme.border,
            },
            styles.chipNoIcon,
          ]}
        >
          <Text style={[styles.label, { color: isAllTabsView ? TEXT_ON_COLORED_BACKGROUND : theme.text }]}>{String(totalTabCount)}</Text>
        </Pressable>
      </View>

      <WorkspaceEditor
        visible={editorVisible}
        workspace={editingWorkspace}
        onClose={() => setEditorVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  chipNoIcon: {
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  countWrap: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  count: {
    color: TEXT_ON_COLORED_BACKGROUND,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
});
