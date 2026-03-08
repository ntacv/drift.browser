import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
  const workspaceOrder = useBrowserStore((state) => state.workspaceOrder);
  const workspaces = useBrowserStore((state) => state.workspaces);
  const activeWorkspaceId = useBrowserStore((state) => state.activeWorkspaceId);
  const switchWorkspace = useBrowserStore((state) => state.switchWorkspace);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const handleLongPress = (workspace: Workspace) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setEditingWorkspace(workspace);
    setEditorVisible(true);
  };

  return (
    <>
      <View style={styles.row}>
      {workspaceOrder.map((workspaceId) => {
        const workspace = workspaces[workspaceId];
        if (!workspace) {
          return null;
        }

        const isActive = workspaceId === activeWorkspaceId;
        const iconName = getValidWorkspaceIcon(workspace.emoji);
        return (
          <Pressable
            key={workspaceId}
            onPress={() => {
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
                color={isActive ? '#fff' : theme.text} 
              />
            )}
            <Text style={[styles.label, { color: isActive ? '#fff' : theme.text }]}>{workspace.label}</Text>
            <View style={styles.countWrap}>
              <Text style={styles.count}>{workspace.tabIds.length}</Text>
            </View>
          </Pressable>
        );
      })}
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
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
