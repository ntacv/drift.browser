/**
 * Default settings for Drift Browser on first install.
 * 
 * Edit this file to customize defaults. Changes require rebuilding the app.
 * All values are strongly typed - the compiler will catch invalid configurations.
 * 
 * See DEFAULT_SETTINGS.md for documentation.
 */

import type { AppLanguage, SearchEngine, TabListSize, ThemePreference } from './src/store/types';

// ===== UI Colors =====

// Color used for the "All Tabs" workspace button.
export const ALL_TABS_WORKSPACE_COLOR = "#555b6b";

// Color used when creating a workspace from "save all tabs as workspace".
export const SAVED_TABS_WORKSPACE_COLOR = '#6C7AFA';

// Default color for new workspaces created via the menu.
export const DEFAULT_NEW_WORKSPACE_COLOR = '#7E57C2';

// Color for sheet drawer handles and separators.
export const SHEET_HANDLE_COLOR = '#7d869f';

// Text color for content displayed on colored backgrounds (workspace chips, buttons, etc.).
export const TEXT_ON_COLORED_BACKGROUND = '#FFFFFF';


export interface WorkspaceConfig {
    id: string;
    label: string;
    icon: string | null;
    color: string;
}

export interface DefaultPreferences {
    themePreference: ThemePreference;
    searchEngine: SearchEngine;
    language: AppLanguage;
    tabListSize: TabListSize;
    isLeftHandMode: boolean;
    defaultNewTabUrl: string;
    blockTrackers: boolean;
    isTransparentMode: boolean;
    isCompactTabList: boolean;
    isFullUrlVisible: boolean;
    invertUrlBarSwipeDirection: boolean;
}

export type MenuTileId = 'share' | 'settings' | 'workspace' | 'signout';

export interface DefaultConfig {
    defaultWorkspaces: WorkspaceConfig[];
    preferences: DefaultPreferences;
    menuTileOrder: MenuTileId[];
}

/**
 * Default configuration
 * TypeScript will validate all values at compile time
 */
export const defaultSettings: DefaultConfig = {
    defaultWorkspaces: [
        {
            id: 'ws-personal',
            label: 'Personal',
            icon: 'home',
            color: '#4B8BFF',
        },
        {
            id: 'ws-work',
            label: 'Work',
            icon: 'work',
            color: '#ff3838',
        },
        {
            id: 'ws-research',
            label: 'Research',
            icon: 'science',
            color: '#2AB673',
        },
    ],
    preferences: {
        themePreference: 'system',
        searchEngine: 'brave',
        language: 'en',
        tabListSize: 'comfortable',
        isLeftHandMode: false,
        defaultNewTabUrl: 'https://zen-browser.app',
        blockTrackers: true,
        isTransparentMode: false,
        isCompactTabList: false,
        isFullUrlVisible: false,
        invertUrlBarSwipeDirection: false,
    },
    menuTileOrder: ['share', 'settings', 'workspace', 'signout'],
};
