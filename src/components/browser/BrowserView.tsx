import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useBrowserStore } from '../../store/browserStore';
import { WebViewWrapper } from './WebViewWrapper';

export const BrowserView = () => {
  const activeWorkspaceId = useBrowserStore((state) => state.activeWorkspaceId);
  const workspaces = useBrowserStore((state) => state.workspaces);

  const workspace = workspaces[activeWorkspaceId];

  if (!workspace?.activeTabId) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <WebViewWrapper key={workspace.activeTabId} tabId={workspace.activeTabId} visible />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
