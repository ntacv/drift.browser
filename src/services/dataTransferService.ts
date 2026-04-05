import type { BrowserState, Tab, Workspace } from '../store/types';

const BACKUP_SCHEMA = 'drift.backup.v1';

const DEFAULT_URL = 'https://zen-browser.app';
const UNSORTED_FOLDER_ID = 'folder-unsorted';

type PersistedBrowserData = Pick<
    BrowserState,
    | 'workspaces'
    | 'workspaceOrder'
    | 'tabs'
    | 'activeWorkspaceId'
    | 'syncUser'
    | 'lastSyncedAt'
    | 'bookmarks'
    | 'bookmarkFolders'
    | 'history'
    | 'themePreference'
    | 'searchEngine'
    | 'language'
    | 'tabListSize'
    | 'menuTileOrder'
    | 'isLeftHandMode'
    | 'defaultNewTabUrl'
    | 'blockTrackers'
    | 'isTransparentMode'
    | 'isCompactTabList'
    | 'isFullUrlVisible'
    | 'isAllTabsView'
>;

export interface DriftBackupFile {
    schema: typeof BACKUP_SCHEMA;
    exportedAt: number;
    app: 'drift-browser';
    data: PersistedBrowserData;
}

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;

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

const makeFallbackTab = (workspaceId: string, url: string): Tab => ({
    id: makeId('tab-import'),
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const pickPersistedData = (state: BrowserState): PersistedBrowserData => ({
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
});

export const createBackupJson = (state: BrowserState): string => {
    const backup: DriftBackupFile = {
        schema: BACKUP_SCHEMA,
        exportedAt: Date.now(),
        app: 'drift-browser',
        data: pickPersistedData(state),
    };

    return JSON.stringify(backup, null, 2);
};

export const parseBackupJson = (raw: string): DriftBackupFile => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error('invalidJson');
    }

    if (!isRecord(parsed) || parsed.schema !== BACKUP_SCHEMA || !isRecord(parsed.data)) {
        throw new Error('invalidSchema');
    }

    return parsed as unknown as DriftBackupFile;
};

export const buildImportedState = (
    current: BrowserState,
    imported: DriftBackupFile,
): Partial<BrowserState> => {
    const next = imported.data;

    const nextWorkspacesRaw = isRecord(next.workspaces) ? (next.workspaces as Record<string, Workspace>) : {};
    const nextTabsRaw = isRecord(next.tabs) ? (next.tabs as Record<string, Tab>) : {};

    const workspaceOrder = Array.isArray(next.workspaceOrder)
        ? next.workspaceOrder.filter((id): id is string => typeof id === 'string' && Boolean(nextWorkspacesRaw[id]))
        : [];

    const fallbackWorkspaceId = makeId('ws-import');
    const defaultUrl = normalizeDefaultNewTabUrl(next.defaultNewTabUrl || current.defaultNewTabUrl || DEFAULT_URL);

    const workspaces: Record<string, Workspace> = { ...nextWorkspacesRaw };
    const tabs: Record<string, Tab> = { ...nextTabsRaw };
    const safeWorkspaceOrder = workspaceOrder.length > 0 ? [...workspaceOrder] : [fallbackWorkspaceId];

    if (workspaceOrder.length === 0) {
        const tab = makeFallbackTab(fallbackWorkspaceId, defaultUrl);
        tabs[tab.id] = tab;
        workspaces[fallbackWorkspaceId] = {
            id: fallbackWorkspaceId,
            label: 'Imported',
            emoji: 'work',
            color: '#4B8BFF',
            tabIds: [tab.id],
            activeTabId: tab.id,
        };
    }

    safeWorkspaceOrder.forEach((workspaceId) => {
        const workspace = workspaces[workspaceId];
        if (!workspace) {
            return;
        }

        const validTabIds = workspace.tabIds.filter((tabId) => {
            const tab = tabs[tabId];
            return Boolean(tab && tab.workspaceId === workspaceId);
        });

        if (validTabIds.length === 0) {
            const fallback = makeFallbackTab(workspaceId, defaultUrl);
            tabs[fallback.id] = fallback;
            workspaces[workspaceId] = {
                ...workspace,
                tabIds: [fallback.id],
                activeTabId: fallback.id,
            };
            return;
        }

        const nextActiveTabId = validTabIds.includes(workspace.activeTabId ?? '')
            ? workspace.activeTabId
            : validTabIds[0];

        workspaces[workspaceId] = {
            ...workspace,
            tabIds: validTabIds,
            activeTabId: nextActiveTabId,
        };
    });

    const activeWorkspaceId =
        typeof next.activeWorkspaceId === 'string' && safeWorkspaceOrder.includes(next.activeWorkspaceId)
            ? next.activeWorkspaceId
            : safeWorkspaceOrder[0];

    const bookmarkFolders = isRecord(next.bookmarkFolders)
        ? (next.bookmarkFolders as BrowserState['bookmarkFolders'])
        : {};

    if (!bookmarkFolders[UNSORTED_FOLDER_ID]) {
        bookmarkFolders[UNSORTED_FOLDER_ID] = {
            id: UNSORTED_FOLDER_ID,
            label: 'Unsorted',
        };
    }

    return {
        workspaces,
        workspaceOrder: safeWorkspaceOrder,
        tabs,
        activeWorkspaceId,
        syncUser: next.syncUser ?? null,
        lastSyncedAt: typeof next.lastSyncedAt === 'number' ? next.lastSyncedAt : null,
        bookmarks: isRecord(next.bookmarks) ? (next.bookmarks as BrowserState['bookmarks']) : {},
        bookmarkFolders,
        history: Array.isArray(next.history) ? next.history : [],
        themePreference: next.themePreference,
        searchEngine: next.searchEngine,
        language: next.language,
        tabListSize: next.tabListSize,
        menuTileOrder: Array.isArray(next.menuTileOrder) ? next.menuTileOrder : current.menuTileOrder,
        isLeftHandMode: Boolean(next.isLeftHandMode),
        defaultNewTabUrl: defaultUrl,
        blockTrackers: Boolean(next.blockTrackers),
        isTransparentMode: Boolean(next.isTransparentMode),
        isCompactTabList: Boolean(next.isCompactTabList),
        isFullUrlVisible: Boolean(next.isFullUrlVisible),
        isAllTabsView: Boolean(next.isAllTabsView),
        isMenuOpen: false,
        isTrayOpen: false,
        isUrlOverlayOpen: false,
        isUserFullscreen: false,
    };
};
