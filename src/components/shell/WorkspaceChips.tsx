import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBrowserStore } from '../../store/browserStore';
import { useTheme } from '../../theme';

export const WorkspaceChips = () => {
  const { theme } = useTheme();
  const workspaceOrder = useBrowserStore((state) => state.workspaceOrder);
  const workspaces = useBrowserStore((state) => state.workspaces);
  const activeWorkspaceId = useBrowserStore((state) => state.activeWorkspaceId);
  const switchWorkspace = useBrowserStore((state) => state.switchWorkspace);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {workspaceOrder.map((workspaceId) => {
        const workspace = workspaces[workspaceId];
        if (!workspace) {
          return null;
        }

        const isActive = workspaceId === activeWorkspaceId;
        return (
          <Pressable
            key={workspaceId}
            onPress={() => {
              switchWorkspace(workspaceId);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? workspace.color : theme.surface2,
                borderColor: isActive ? workspace.color : theme.border,
              },
            ]}
          >
            <Text style={styles.emoji}>{workspace.emoji}</Text>
            <Text style={[styles.label, { color: isActive ? '#fff' : theme.text }]}>{workspace.label}</Text>
            <View style={styles.countWrap}>
              <Text style={styles.count}>{workspace.tabIds.length}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
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
  emoji: {
    fontSize: 15,
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
