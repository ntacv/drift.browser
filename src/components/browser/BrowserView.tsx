import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { selectLiveTabs } from '../../hooks/liveTabs';
import { StyleSheet, View } from 'react-native';

import { useBrowserStore } from '../../store/browserStore';
import { WebViewWrapper } from './WebViewWrapper';

export const BrowserView = () => {
  const activeTabId = useBrowserStore((state) => state.workspaces[state.activeWorkspaceId]?.activeTabId ?? null);
  const tabIds = useBrowserStore(useShallow((state) => Object.keys(state.tabs)));
  const [cachedIds, setCachedIds] = useState<string[]>([]);
  const liveIds = selectLiveTabs(cachedIds, activeTabId, new Set(tabIds));
  if (liveIds !== cachedIds) setCachedIds(liveIds);

  return (
    <View style={styles.container}>
      {liveIds.map((tabId) => (
        <WebViewWrapper key={tabId} tabId={tabId} visible={tabId === activeTabId} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
