export type ThemePreference = 'light' | 'dark' | 'system';

export type SearchEngine = 'brave' | 'duckduckgo' | 'google' | 'bing';
export type AppLanguage = 'en' | 'fr';

export type TabListSize = 'compact' | 'comfortable' | 'expanded';

export interface SyncUser {
  email: string;
  uid: string;
}

export interface Tab {
  id: string;
  workspaceId: string;
  url: string;
  title: string;
  favicon: string | null;
  isPinned: boolean;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  pendingNavAction: 'back' | 'forward' | 'reload' | null;
  pendingNavActionId: number;
  scrollY: number;
  createdAt: number;
}

export interface Workspace {
  id: string;
  label: string;
  emoji: string;
  color: string;
  tabIds: string[];
  activeTabId: string | null;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  folderId: string | null;
  createdAt: number;
}

export interface BookmarkFolder {
  id: string;
  label: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}

export interface BrowserState {
  workspaces: Record<string, Workspace>;
  workspaceOrder: string[];
  tabs: Record<string, Tab>;
  activeWorkspaceId: string;
  isTrayOpen: boolean;
  isMenuOpen: boolean;
  syncUser: SyncUser | null;
  lastSyncedAt: number | null;
  bookmarks: Record<string, Bookmark>;
  bookmarkFolders: Record<string, BookmarkFolder>;
  history: HistoryEntry[];
  themePreference: ThemePreference;
  searchEngine: SearchEngine;
  language: AppLanguage;
  tabListSize: TabListSize;
  menuTileOrder: string[];
  isLeftHandMode: boolean;
  defaultNewTabUrl: string;
  urlOverlayOpenRequestId: number;
  blockTrackers: boolean;
  isFullscreen: boolean;
  isTransparentMode: boolean;
}

export interface BrowserActions {
  createTab: (workspaceId?: string, url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  goToNextTab: () => void;
  goToPreviousTab: () => void;
  navigateActiveTab: (nextUrl: string) => void;
  requestActiveTabNavigation: (action: 'back' | 'forward' | 'reload') => void;
  updateTabMeta: (tabId: string, patch: Partial<Tab>) => void;

  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (label: string, emoji: string, color: string) => void;

  setTrayOpen: (isOpen: boolean) => void;
  setMenuOpen: (isOpen: boolean) => void;

  addBookmarkFromActiveTab: () => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'visitedAt'>) => void;
  clearHistory: () => void;

  setThemePreference: (preference: ThemePreference) => void;
  setSearchEngine: (searchEngine: SearchEngine) => void;
  setLanguage: (language: AppLanguage) => void;
  setTabListSize: (size: TabListSize) => void;
  setMenuTileOrder: (order: string[]) => void;
  setLeftHandMode: (value: boolean) => void;
  setDefaultNewTabUrl: (url: string) => void;
  setBlockTrackers: (value: boolean) => void;
  setFullscreen: (value: boolean) => void;
  setTransparentMode: (value: boolean) => void;

  setSyncUser: (syncUser: SyncUser | null) => void;
  setLastSyncedAt: (timestamp: number | null) => void;
}

export type BrowserStore = BrowserState & BrowserActions;
