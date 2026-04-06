export type ThemePreference = 'light' | 'dark' | 'system';

export type SearchEngine = 'brave' | 'duckduckgo' | 'google' | 'bing';
export type AppLanguage = 'en' | 'fr';

export type TabListSize = 'compact' | 'comfortable' | 'expanded';

export type BarPosition = 'bottom' | 'top';

export interface SyncUser {
  email: string;
  uid: string;
}

export interface TabWebError {
  code: string;
  message: string;
  url: string;
  at: number;
}

export interface LinkActionPanelPayload {
  tabId: string;
  href: string;
  text: string;
}

export interface Tab {
  id: string;
  workspaceId: string;
  url: string;
  title: string;
  favicon: string | null;
  themeColor: string | null;
  isPinned: boolean;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  pendingNavAction: 'back' | 'forward' | 'reload' | null;
  pendingNavActionId: number;
  scrollY: number;
  createdAt: number;
  webContentFullscreen: boolean;
  webError: TabWebError | null;
}

export interface Workspace {
  id: string;
  label: string;
  emoji: string | null;
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
  isUrlOverlayOpen: boolean;
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
  urlOverlayCloseRequestId: number;
  blockTrackers: boolean;
  isUserFullscreen: boolean;
  isTransparentMode: boolean;
  isCompactTabList: boolean;
  isFullUrlVisible: boolean;
  isAllTabsView: boolean;
  hideFullscreenAlert: boolean;
  useWebsiteThemeColor: boolean;
  debugMode: boolean;
  hideBarOnScroll: boolean;
  barPosition: BarPosition;
  isCompactWorkspace: boolean;
  linkActionPanel: LinkActionPanelPayload | null;
}

export interface BrowserActions {
  createTab: (workspaceId?: string, url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  duplicateTab: (tabId: string) => void;
  moveTabToWorkspace: (tabId: string, targetWorkspaceId: string) => void;
  goToNextTab: () => void;
  goToPreviousTab: () => void;
  navigateActiveTab: (nextUrl: string) => void;
  requestActiveTabNavigation: (action: 'back' | 'forward' | 'reload') => void;
  updateTabMeta: (tabId: string, patch: Partial<Tab>) => void;

  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (label: string, emoji: string | null, color: string) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Pick<Workspace, 'label' | 'emoji' | 'color'>>) => void;
  moveWorkspace: (workspaceId: string, direction: 'left' | 'right') => void;
  removeWorkspace: (workspaceId: string) => void;

  setTrayOpen: (isOpen: boolean) => void;
  setAllTabsView: (value: boolean) => void;
  setMenuOpen: (isOpen: boolean) => void;
  setUrlOverlayOpen: (isOpen: boolean) => void;
  requestCloseUrlOverlay: () => void;

  closeAllTabs: () => void;
  saveAllTabsAsWorkspace: (label?: string) => void;

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
  setUserFullscreen: (value: boolean) => void;
  setTransparentMode: (value: boolean) => void;
  setCompactTabList: (value: boolean) => void;
  setFullUrlVisible: (value: boolean) => void;
  setHideFullscreenAlert: (value: boolean) => void;
  setUseWebsiteThemeColor: (value: boolean) => void;
  setDebugMode: (value: boolean) => void;
  setHideBarOnScroll: (value: boolean) => void;
  setBarPosition: (position: BarPosition) => void;
  setCompactWorkspace: (value: boolean) => void;
  setLinkActionPanel: (payload: LinkActionPanelPayload | null) => void;

  setSyncUser: (syncUser: SyncUser | null) => void;
  setLastSyncedAt: (timestamp: number | null) => void;
}

export type BrowserStore = BrowserState & BrowserActions;
