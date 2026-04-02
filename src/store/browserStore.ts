import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MaterialIcons } from '@expo/vector-icons';

import type {
  AppLanguage,
  BookmarkFolder,
  BrowserStore,
  SearchEngine,
  Tab,
  TabListSize,
  ThemePreference,
  Workspace,
} from './types';
import { getDefaultConfig } from './defaultConfig';
import { SAVED_TABS_WORKSPACE_COLOR } from '../../default-settings';

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;

const DEFAULT_URL = 'https://zen-browser.app';
const UNSORTED_FOLDER_ID = 'folder-unsorted';
const HISTORY_CAP = 500;
const DEFAULT_MENU_TILE_ORDER = [
  'share',
  'settings',
  'workspace',
  'fullscreen',
  'signout',
];

const LEGACY_WORKSPACE_ICON_MAP: Record<string, string> = {
  '🏠': 'home',
  '💼': 'work',
  '🔬': 'science',
  '✨': 'star',
};

const normalizeWorkspaceIcon = (icon: unknown): string | null => {
  if (typeof icon !== 'string' || icon.length === 0) {
    return null;
  }

  const mapped = LEGACY_WORKSPACE_ICON_MAP[icon] ?? icon;
  if (Object.prototype.hasOwnProperty.call(MaterialIcons.glyphMap, mapped)) {
    return mapped;
  }

  return null;
};

const normalizeDefaultNewTabUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_URL;
  }
  if (trimmed.toLowerCase() === 'about:blank') {
    return 'about:blank';
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const makeTab = (workspaceId: string, url = DEFAULT_URL): Tab => ({
  id: makeId('tab'),
  workspaceId,
  url,
  title: 'New Tab',
  favicon: null,
  themeColor: null,
  isPinned: false,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  pendingNavAction: null,
  pendingNavActionId: 0,
  scrollY: 0,
  createdAt: Date.now(),
  webContentFullscreen: false,
});

const createWorkspaceWithTab = (
  id: string,
  label: string,
  emoji: string | null,
  color: string,
): { workspace: Workspace; tab: Tab } => {
  const tab = makeTab(id);
  return {
    tab,
    workspace: {
      id,
      label,
      emoji,
      color,
      tabIds: [tab.id],
      activeTabId: tab.id,
    },
  };
};

const unsortedFolder: BookmarkFolder = {
  id: UNSORTED_FOLDER_ID,
  label: 'Unsorted',
};

/**
 * Build initial state from default config
 */
const buildInitialState = () => {
  const config = getDefaultConfig();

  // Create workspaces and tabs from config
  const workspaceData = config.defaultWorkspaces.map((ws) =>
    createWorkspaceWithTab(ws.id, ws.label, ws.icon, ws.color)
  );

  const workspaces: Record<string, Workspace> = {};
  const tabs: Record<string, Tab> = {};
  const workspaceOrder: string[] = [];

  workspaceData.forEach(({ workspace, tab }) => {
    workspaces[workspace.id] = workspace;
    tabs[tab.id] = tab;
    workspaceOrder.push(workspace.id);
  });

  const activeWorkspaceId = workspaceOrder[0] || 'ws-personal';

  return {
    workspaces,
    workspaceOrder,
    tabs,
    activeWorkspaceId,
    isTrayOpen: false,
    isMenuOpen: false,
    isUrlOverlayOpen: false,
    syncUser: null,
    lastSyncedAt: null,
    bookmarks: {},
    bookmarkFolders: {
      [unsortedFolder.id]: unsortedFolder,
    },
    history: [],
    themePreference: config.preferences.themePreference,
    searchEngine: config.preferences.searchEngine,
    language: config.preferences.language,
    tabListSize: config.preferences.tabListSize,
    menuTileOrder: config.menuTileOrder,
    isLeftHandMode: config.preferences.isLeftHandMode,
    defaultNewTabUrl: config.preferences.defaultNewTabUrl,
    urlOverlayOpenRequestId: 0,
    urlOverlayCloseRequestId: 0,
    blockTrackers: config.preferences.blockTrackers,
    isUserFullscreen: false,
    isTransparentMode: config.preferences.isTransparentMode,
    isCompactTabList: config.preferences.isCompactTabList,
    isFullUrlVisible: config.preferences.isFullUrlVisible,
    isAllTabsView: false,
    hideFullscreenAlert: false,
    useWebsiteThemeColor: false,
  };
};

const initialState = buildInitialState();

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      createTab: (workspaceId, url) =>
        set((state) => {
          const targetWorkspaceId = workspaceId ?? state.activeWorkspaceId;
          const workspace = state.workspaces[targetWorkspaceId];
          if (!workspace) {
            return state;
          }

          const configuredDefault = state.defaultNewTabUrl.trim();
          const shouldOpenUrlOverlay = !url && configuredDefault.length === 0;
          const nextUrl =
            url ?? (shouldOpenUrlOverlay ? 'about:blank' : normalizeDefaultNewTabUrl(state.defaultNewTabUrl));

          const tab = makeTab(targetWorkspaceId, nextUrl);
          return {
            tabs: {
              ...state.tabs,
              [tab.id]: tab,
            },
            urlOverlayOpenRequestId: shouldOpenUrlOverlay
              ? state.urlOverlayOpenRequestId + 1
              : state.urlOverlayOpenRequestId,
            workspaces: {
              ...state.workspaces,
              [targetWorkspaceId]: {
                ...workspace,
                tabIds: [tab.id, ...workspace.tabIds],
                activeTabId: tab.id,
              },
            },
          };
        }),

      closeTab: (tabId) =>
        set((state) => {
          const tab = state.tabs[tabId];
          if (!tab) {
            return state;
          }

          const workspace = state.workspaces[tab.workspaceId];
          if (!workspace) {
            return state;
          }

          const nextTabIds = workspace.tabIds.filter((id) => id !== tabId);
          const nextTabs = { ...state.tabs };
          delete nextTabs[tabId];

          if (nextTabIds.length === 0) {
            const fallback = makeTab(workspace.id, normalizeDefaultNewTabUrl(state.defaultNewTabUrl));
            nextTabs[fallback.id] = fallback;
            return {
              tabs: nextTabs,
              workspaces: {
                ...state.workspaces,
                [workspace.id]: {
                  ...workspace,
                  tabIds: [fallback.id],
                  activeTabId: fallback.id,
                },
              },
            };
          }

          const nextActive = workspace.activeTabId === tabId ? nextTabIds[0] : workspace.activeTabId;
          return {
            tabs: nextTabs,
            workspaces: {
              ...state.workspaces,
              [workspace.id]: {
                ...workspace,
                tabIds: nextTabIds,
                activeTabId: nextActive,
              },
            },
          };
        }),

      duplicateTab: (tabId) =>
        set((state) => {
          const tab = state.tabs[tabId];
          if (!tab) {
            return state;
          }
          const workspace = state.workspaces[tab.workspaceId];
          if (!workspace) {
            return state;
          }
          const newTab = makeTab(tab.workspaceId, tab.url);
          const tabIndex = workspace.tabIds.indexOf(tabId);
          const nextTabIds = [...workspace.tabIds];
          nextTabIds.splice(tabIndex + 1, 0, newTab.id);
          return {
            tabs: { ...state.tabs, [newTab.id]: newTab },
            workspaces: {
              ...state.workspaces,
              [workspace.id]: {
                ...workspace,
                tabIds: nextTabIds,
              },
            },
          };
        }),

      moveTabToWorkspace: (tabId, targetWorkspaceId) =>
        set((state) => {
          const tab = state.tabs[tabId];
          if (!tab || tab.workspaceId === targetWorkspaceId) {
            return state;
          }
          const sourceWorkspace = state.workspaces[tab.workspaceId];
          const targetWorkspace = state.workspaces[targetWorkspaceId];
          if (!sourceWorkspace || !targetWorkspace) {
            return state;
          }

          const sourceTabIds = sourceWorkspace.tabIds.filter((id) => id !== tabId);
          const nextTabs = { ...state.tabs, [tabId]: { ...tab, workspaceId: targetWorkspaceId } };

          let sourceUpdate = { ...sourceWorkspace, tabIds: sourceTabIds };
          if (sourceTabIds.length === 0) {
            const fallback = makeTab(sourceWorkspace.id, normalizeDefaultNewTabUrl(state.defaultNewTabUrl));
            nextTabs[fallback.id] = fallback;
            sourceUpdate = { ...sourceUpdate, tabIds: [fallback.id], activeTabId: fallback.id };
          } else if (sourceWorkspace.activeTabId === tabId) {
            sourceUpdate = { ...sourceUpdate, activeTabId: sourceTabIds[0] };
          }

          return {
            tabs: nextTabs,
            workspaces: {
              ...state.workspaces,
              [sourceWorkspace.id]: sourceUpdate,
              [targetWorkspace.id]: {
                ...targetWorkspace,
                tabIds: [tabId, ...targetWorkspace.tabIds],
                activeTabId: targetWorkspace.activeTabId ?? tabId,
              },
            },
          };
        }),

      switchTab: (tabId) =>
        set((state) => {
          const tab = state.tabs[tabId];
          if (!tab) {
            return state;
          }
          const workspace = state.workspaces[tab.workspaceId];
          if (!workspace) {
            return state;
          }
          return {
            activeWorkspaceId: workspace.id,
            workspaces: {
              ...state.workspaces,
              [workspace.id]: {
                ...workspace,
                activeTabId: tabId,
              },
            },
          };
        }),

      goToNextTab: () => {
        const state = get();
        const workspace = state.workspaces[state.activeWorkspaceId];
        if (!workspace || workspace.tabIds.length < 2 || !workspace.activeTabId) {
          return;
        }
        const current = workspace.tabIds.indexOf(workspace.activeTabId);
        const next = (current + 1) % workspace.tabIds.length;
        get().switchTab(workspace.tabIds[next]);
      },

      goToPreviousTab: () => {
        const state = get();
        const workspace = state.workspaces[state.activeWorkspaceId];
        if (!workspace || workspace.tabIds.length < 2 || !workspace.activeTabId) {
          return;
        }
        const current = workspace.tabIds.indexOf(workspace.activeTabId);
        const prev = (current - 1 + workspace.tabIds.length) % workspace.tabIds.length;
        get().switchTab(workspace.tabIds[prev]);
      },

      navigateActiveTab: (nextUrl) =>
        set((state) => {
          const workspace = state.workspaces[state.activeWorkspaceId];
          if (!workspace?.activeTabId) {
            return state;
          }
          const tab = state.tabs[workspace.activeTabId];
          if (!tab) {
            return state;
          }
          return {
            tabs: {
              ...state.tabs,
              [tab.id]: {
                ...tab,
                url: nextUrl,
                isLoading: true,
              },
            },
          };
        }),

      requestActiveTabNavigation: (action) =>
        set((state) => {
          const workspace = state.workspaces[state.activeWorkspaceId];
          if (!workspace?.activeTabId) {
            return state;
          }

          const tab = state.tabs[workspace.activeTabId];
          if (!tab) {
            return state;
          }

          return {
            tabs: {
              ...state.tabs,
              [tab.id]: {
                ...tab,
                pendingNavAction: action,
                pendingNavActionId: tab.pendingNavActionId + 1,
              },
            },
          };
        }),

      updateTabMeta: (tabId, patch) =>
        set((state) => {
          const tab = state.tabs[tabId];
          if (!tab) {
            return state;
          }
          return {
            tabs: {
              ...state.tabs,
              [tabId]: {
                ...tab,
                ...patch,
              },
            },
          };
        }),

      switchWorkspace: (workspaceId) =>
        set((state) => {
          if (!state.workspaces[workspaceId]) {
            return state;
          }
          return {
            activeWorkspaceId: workspaceId,
            isAllTabsView: false,
          };
        }),

      createWorkspace: (label, emoji, color) =>
        set((state) => {
          const id = makeId('ws');
          const { workspace, tab } = createWorkspaceWithTab(id, label, emoji, color);
          return {
            workspaces: {
              ...state.workspaces,
              [id]: workspace,
            },
            tabs: {
              ...state.tabs,
              [tab.id]: tab,
            },
            workspaceOrder: [...state.workspaceOrder, id],
            activeWorkspaceId: id,
          };
        }),

      updateWorkspace: (workspaceId, updates) =>
        set((state) => {
          const workspace = state.workspaces[workspaceId];
          if (!workspace) {
            return state;
          }
          return {
            workspaces: {
              ...state.workspaces,
              [workspaceId]: {
                ...workspace,
                ...updates,
              },
            },
          };
        }),

      moveWorkspace: (workspaceId, direction) =>
        set((state) => {
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
        }),

      removeWorkspace: (workspaceId) =>
        set((state) => {
          // Don't allow removing the last workspace
          if (state.workspaceOrder.length <= 1) {
            return state;
          }

          const workspace = state.workspaces[workspaceId];
          if (!workspace) {
            return state;
          }

          // Remove all tabs associated with this workspace
          const nextTabs = { ...state.tabs };
          workspace.tabIds.forEach((tabId) => {
            delete nextTabs[tabId];
          });

          // Remove workspace from workspaces object
          const nextWorkspaces = { ...state.workspaces };
          delete nextWorkspaces[workspaceId];

          // Remove from workspace order
          const nextWorkspaceOrder = state.workspaceOrder.filter((id) => id !== workspaceId);

          // If the removed workspace was active, switch to the nearest one
          let nextActiveWorkspaceId = state.activeWorkspaceId;
          if (state.activeWorkspaceId === workspaceId) {
            const currentIndex = state.workspaceOrder.indexOf(workspaceId);
            const nextIndex = Math.min(currentIndex, nextWorkspaceOrder.length - 1);
            nextActiveWorkspaceId = nextWorkspaceOrder[nextIndex];
          }

          return {
            workspaces: nextWorkspaces,
            tabs: nextTabs,
            workspaceOrder: nextWorkspaceOrder,
            activeWorkspaceId: nextActiveWorkspaceId,
          };
        }),

      setTrayOpen: (isOpen) => set({ isTrayOpen: isOpen }),
      setAllTabsView: (value) => set({ isAllTabsView: value }),
      setMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
      setUrlOverlayOpen: (isOpen) => set({ isUrlOverlayOpen: isOpen }),
      requestCloseUrlOverlay: () => set((state) => ({ urlOverlayCloseRequestId: state.urlOverlayCloseRequestId + 1 })),

      closeAllTabs: () =>
        set((state) => {
          const activeWorkspace = state.workspaces[state.activeWorkspaceId];
          if (!activeWorkspace) {
            return state;
          }

          const fallback = makeTab(activeWorkspace.id, normalizeDefaultNewTabUrl(state.defaultNewTabUrl));
          const nextTabs: Record<string, Tab> = {
            [fallback.id]: fallback,
          };

          const nextWorkspaces = Object.fromEntries(
            Object.entries(state.workspaces).map(([id, workspace]) => {
              if (id === activeWorkspace.id) {
                return [
                  id,
                  {
                    ...workspace,
                    tabIds: [fallback.id],
                    activeTabId: fallback.id,
                  },
                ];
              }

              return [
                id,
                {
                  ...workspace,
                  tabIds: [],
                  activeTabId: null,
                },
              ];
            }),
          ) as Record<string, Workspace>;

          return {
            tabs: nextTabs,
            workspaces: nextWorkspaces,
            isAllTabsView: false,
          };
        }),

      saveAllTabsAsWorkspace: (label) =>
        set((state) => {
          const sourceTabs = state.workspaceOrder.flatMap((workspaceId) => {
            const workspace = state.workspaces[workspaceId];
            if (!workspace) {
              return [] as Tab[];
            }
            return workspace.tabIds
              .map((tabId) => state.tabs[tabId])
              .filter((tab): tab is Tab => Boolean(tab));
          });

          const id = makeId('ws');
          const nextWorkspaceLabel = label?.trim() || 'Saved Tabs';

          if (sourceTabs.length === 0) {
            const { workspace, tab } = createWorkspaceWithTab(id, nextWorkspaceLabel, null, SAVED_TABS_WORKSPACE_COLOR);
            return {
              workspaces: {
                ...state.workspaces,
                [id]: workspace,
              },
              tabs: {
                ...state.tabs,
                [tab.id]: tab,
              },
              workspaceOrder: [...state.workspaceOrder, id],
              activeWorkspaceId: id,
              isAllTabsView: false,
            };
          }

          const clonedTabs = sourceTabs.map((sourceTab) => {
            const cloned = makeTab(id, sourceTab.url);
            return {
              ...cloned,
              title: sourceTab.title,
              favicon: sourceTab.favicon,
              isPinned: sourceTab.isPinned,
            };
          });

          const nextWorkspace: Workspace = {
            id,
            label: nextWorkspaceLabel,
            emoji: 'work',
            color: SAVED_TABS_WORKSPACE_COLOR,
            tabIds: clonedTabs.map((tab) => tab.id),
            activeTabId: clonedTabs[0]?.id ?? null,
          };

          return {
            workspaces: {
              ...state.workspaces,
              [id]: nextWorkspace,
            },
            tabs: {
              ...state.tabs,
              ...Object.fromEntries(clonedTabs.map((tab) => [tab.id, tab])),
            },
            workspaceOrder: [...state.workspaceOrder, id],
            activeWorkspaceId: id,
            isAllTabsView: false,
          };
        }),

      addBookmarkFromActiveTab: () =>
        set((state) => {
          const workspace = state.workspaces[state.activeWorkspaceId];
          const tab = workspace?.activeTabId ? state.tabs[workspace.activeTabId] : null;
          if (!tab) {
            return state;
          }
          const bookmarkId = makeId('bm');
          return {
            bookmarks: {
              ...state.bookmarks,
              [bookmarkId]: {
                id: bookmarkId,
                url: tab.url,
                title: tab.title,
                favicon: tab.favicon,
                folderId: UNSORTED_FOLDER_ID,
                createdAt: Date.now(),
              },
            },
          };
        }),

      addHistoryEntry: (entry) =>
        set((state) => {
          const next = [
            {
              id: makeId('hist'),
              visitedAt: Date.now(),
              ...entry,
            },
            ...state.history,
          ].slice(0, HISTORY_CAP);
          return { history: next };
        }),

      clearHistory: () => set({ history: [] }),

      setThemePreference: (preference) => set({ themePreference: preference }),
      setSearchEngine: (searchEngine) => set({ searchEngine }),
      setLanguage: (language) => set({ language }),
      setTabListSize: (size) => set({ tabListSize: size }),
      setMenuTileOrder: (order) => set({ menuTileOrder: order }),
      setLeftHandMode: (value) => set({ isLeftHandMode: value }),
      setDefaultNewTabUrl: (url) => set({ defaultNewTabUrl: url }),
      setBlockTrackers: (value) => set({ blockTrackers: value }),
      setUserFullscreen: (value) => set({ isUserFullscreen: value }),
      setTransparentMode: (value) => set({ isTransparentMode: value }),
      setCompactTabList: (value) => set({ isCompactTabList: value }),
      setFullUrlVisible: (value) => set({ isFullUrlVisible: value }),
      setHideFullscreenAlert: (value) => set({ hideFullscreenAlert: value }),
      setUseWebsiteThemeColor: (value) => set({ useWebsiteThemeColor: value }),

      setSyncUser: (syncUser) => set({ syncUser }),
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
    }),
    {
      name: 'drift-browser-store-v2',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        const workspaces = persistedState.workspaces;
        if (!workspaces || typeof workspaces !== 'object') {
          return persistedState;
        }

        const normalizedWorkspaces = Object.fromEntries(
          Object.entries(workspaces).map(([id, workspace]) => {
            const typedWorkspace = workspace as Workspace;
            return [
              id,
              {
                ...typedWorkspace,
                emoji: normalizeWorkspaceIcon(typedWorkspace.emoji),
              },
            ];
          }),
        );

        // Reset fullscreen state and theme color for all tabs on app restart
        const tabs = persistedState.tabs;
        const normalizedTabs =
          tabs && typeof tabs === 'object'
            ? Object.fromEntries(
              Object.entries(tabs).map(([id, tab]) => [
                id,
                {
                  ...(tab as Tab),
                  webContentFullscreen: false,
                  themeColor: null,
                },
              ]),
            )
            : tabs;

        return {
          ...persistedState,
          workspaces: normalizedWorkspaces,
          tabs: normalizedTabs,
        };
      },
      partialize: (state) => ({
        workspaces: state.workspaces,
        workspaceOrder: state.workspaceOrder,
        tabs: state.tabs,
        activeWorkspaceId: state.activeWorkspaceId,
        syncUser: state.syncUser,
        lastSyncedAt: state.lastSyncedAt,
        bookmarks: state.bookmarks,
        bookmarkFolders: state.bookmarkFolders,
        history: state.history,
        themePreference: state.themePreference,
        searchEngine: state.searchEngine,
        language: state.language,
        tabListSize: state.tabListSize,
        menuTileOrder: state.menuTileOrder,
        isLeftHandMode: state.isLeftHandMode,
        defaultNewTabUrl: state.defaultNewTabUrl,
        blockTrackers: state.blockTrackers,
        isTransparentMode: state.isTransparentMode,
        isCompactTabList: state.isCompactTabList,
        isFullUrlVisible: state.isFullUrlVisible,
        isAllTabsView: state.isAllTabsView,
        hideFullscreenAlert: state.hideFullscreenAlert,
        useWebsiteThemeColor: state.useWebsiteThemeColor,
        useWebsiteThemeColor: state.useWebsiteThemeColor,
      }),
    },
  ),
);

export const getActiveWorkspace = (state: BrowserStore): Workspace | null =>
  state.workspaces[state.activeWorkspaceId] ?? null;

export const getActiveTab = (state: BrowserStore): Tab | null => {
  const workspace = state.workspaces[state.activeWorkspaceId];
  if (!workspace?.activeTabId) {
    return null;
  }
  return state.tabs[workspace.activeTabId] ?? null;
};
