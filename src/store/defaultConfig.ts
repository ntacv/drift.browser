import { defaultSettings } from '../../default-settings';
import type { DefaultConfig, WorkspaceConfig, DefaultPreferences } from '../../default-settings';

// Re-export types for convenience
export type { WorkspaceConfig, DefaultPreferences, DefaultConfig };

/**
 * Load and validate the default configuration.
 * Falls back to hardcoded defaults if validation fails.
 */
export const getDefaultConfig = (): DefaultConfig => {
    try {
        const config = defaultSettings;

        // Basic validation
        if (
            !config.defaultWorkspaces ||
            !Array.isArray(config.defaultWorkspaces) ||
            config.defaultWorkspaces.length === 0
        ) {
            console.warn('Invalid defaultWorkspaces in config, using fallback');
            return getFallbackConfig();
        }

        if (!config.preferences || typeof config.preferences !== 'object') {
            console.warn('Invalid preferences in config, using fallback');
            return getFallbackConfig();
        }

        return config;
    } catch (error) {
        console.error('Failed to load default config:', error);
        return getFallbackConfig();
    }
};

/**
 * Fallback configuration if JSON fails to load
 */
const getFallbackConfig = (): DefaultConfig => ({
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
            color: '#ce0033',
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
        searchEngine: 'google',
        language: 'en',
        tabListSize: 'comfortable',
        isLeftHandMode: false,
        defaultNewTabUrl: 'https://zen-browser.app',
        blockTrackers: false,
        isTransparentMode: true,
        isCompactTabList: false,
        isFullUrlVisible: false,
        invertUrlBarSwipeDirection: false,
    },
    menuTileOrder: ['share', 'settings', 'workspace', 'signout'],
});
