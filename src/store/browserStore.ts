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

const personal = createWorkspaceWithTab('ws-personal', 'Personal', 'home', '#4B8BFF');
const work = createWorkspaceWithTab('ws-work', 'Work', 'work', '#5965FF');
const research = createWorkspaceWithTab('ws-research', 'Research', 'science', '#2AB673');

const initialState = {
  workspaces: {
    [personal.workspace.id]: personal.workspace,
    [work.workspace.id]: work.workspace,
    [research.workspace.id]: research.workspace,
  },
  workspaceOrder: [personal.workspace.id, work.workspace.id, research.workspace.id],
  tabs: {
    [personal.tab.id]: personal.tab,
    [work.tab.id]: work.tab,
    [research.tab.id]: research.tab,
  },
  activeWorkspaceId: personal.workspace.id,
  isTrayOpen: false,
  isMenuOpen: false,
  syncUser: null,
  lastSyncedAt: null,
  bookmarks: {},
  bookmarkFolders: {
    [unsortedFolder.id]: unsortedFolder,
  },
  history: [],
  themePreference: 'system' as ThemePreference,
  searchEngine: 'brave' as SearchEngine,
  language: 'en' as AppLanguage,
  tabListSize: 'comfortable' as TabListSize,
  menuTileOrder: DEFAULT_MENU_TILE_ORDER,
  isLeftHandMode: false,
  defaultNewTabUrl: DEFAULT_URL,
  urlOverlayOpenRequestId: 0,
  urlOverlayCloseRequestId: 0,
  blockTrackers: true,
  isFullscreen: false,
  isTransparentMode: false,
};

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

      setTrayOpen: (isOpen) => set({ isTrayOpen: isOpen }),
      setMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
      setUrlOverlayOpen: (isOpen) => set({ isUrlOverlayOpen: isOpen }),
      requestCloseUrlOverlay: () => set((state) => ({ urlOverlayCloseRequestId: state.urlOverlayCloseRequestId + 1 })),

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
      setFullscreen: (value) => set({ isFullscreen: value }),
      setTransparentMode: (value) => set({ isTransparentMode: value }),

      setSyncUser: (syncUser) => set({ syncUser }),
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
    }),
    {
      name: 'zen-mobile-browser-store-v2',
      version: 3,
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

        return {
          ...persistedState,
          workspaces: normalizedWorkspaces,
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
        isFullscreen: state.isFullscreen,
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
