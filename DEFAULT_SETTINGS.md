# Default Settings Configuration

This file allows you to customize the default settings that are applied when the Drift Browser app is first installed or when storage is cleared.

**File:** `default-settings.ts` (TypeScript, strongly typed)

All configuration values are validated at compile time. Invalid values (like `"gg"` for search engine) will cause TypeScript errors and prevent the app from building.

## Configuration Structure

### `defaultWorkspaces`
Define the initial workspaces created on first launch.

Each workspace has:
- `id`: Unique identifier (must start with `ws-`)
- `label`: Display name
- `icon`: Material icon name (see available icons below) or `null`
- `color`: Hex color code

**Available Icons:**
- `home`, `work`, `science`, `star`, `lightbulb`, `favorite`
- `school`, `shopping-cart`, `restaurant`, `flight`, `fitness-center`
- `palette`, `music-note`, `menu-book`, `sports-esports`
- `local-fire-department` and other Material Icons

### `preferences`
Default user preferences:

- `themePreference`: `"system"`, `"dark"`, or `"light"`
- `searchEngine`: `"brave"`, `"google"`, `"duckduckgo"`, or `"bing"`
- `language`: `"en"` or `"fr"`
- `tabListSize`: `"compact"`, `"comfortable"`, or `"expanded"`
- `isLeftHandMode`: `true` or `false`
- `defaultNewTabUrl`: URL string or empty string `""` for blank with URL input
- `blockTrackers`: `true` or `false`
- `isTransparentMode`: `true` or `false`
- `isCompactTabList`: `true` or `false`
- `isFullUrlVisible`: `true` or `false` - Display full URLs instead of domain-only

### `menuTileOrder`
Enabled buttons, in display order, in the **Action Menu** (the browser menu containing Refresh, Settings, and other actions). Array of `MenuTileId` type. Omitted buttons stay removed; duplicates and unknown IDs are ignored. Settings is always retained.

Available buttons (strongly typed):
- `"back"` - Navigate back
- `"forward"` - Navigate forward
- `"refresh"` - Reload the current page
- `"fullscreen"` - Toggle fullscreen
- `"history"` - Open browsing history
- `"share"` - Share current page URL
- `"settings"` - Open settings
- `"workspace"` - Create new workspace
- `"signout"` - Sign out of Firefox account

### Customizing the Action Menu

The Action Menu grows with its content up to half the screen height, then scrolls. Long-press any button (including a disabled navigation button) to edit. A scrollable picker opens directly above the menu with all nine actions; already-added buttons are marked. Hold and drag available buttons down into the menu, or tap them to add. Hold and drag menu buttons to reorder; use their remove controls to hide them. Settings can move but cannot be removed. Screen-reader actions also support moving and removing buttons.

Each completed change is saved immediately and survives closing or restarting the app. The **Save** button at the top finishes editing and returns to the normal menu. Drops outside the menu do not change the layout.

Button sizes are fixed: Back, Forward, Refresh, and Fullscreen use small (one-column) buttons; the other actions use medium (two-column) buttons. The layout retains large (four-column) support without a size selector. The menu uses four columns. Sign Out is hidden while signed out outside editing, but its saved position is retained. The picker uses remaining screen space above the half-screen menu and scrolls independently; the menu may shrink further on short screens to keep the editor accessible.

Existing installations retain their previous action order when upgraded, with the previously fixed quick actions included in the editable layout.

## Example Configuration

**File:** `default-settings.ts`

```typescript
export const defaultSettings: DefaultConfig = {
  defaultWorkspaces: [
    {
      id: 'ws-main',
      label: 'Main',
      icon: 'home',
      color: '#4B8BFF',
    },
  ],
  preferences: {
    themePreference: 'dark',
    searchEngine: 'duckduckgo', // TypeScript will error if you use invalid value like 'gg'
    language: 'en',
    tabListSize: 'comfortable',
    isLeftHandMode: false,
    defaultNewTabUrl: 'https://duckduckgo.com',
    blockTrackers: true,
    isTransparentMode: false,
    isCompactTabList: false,
    isFullUrlVisible: true,
  },
  menuTileOrder: ['back', 'forward', 'refresh', 'fullscreen', 'share', 'settings', 'history', 'workspace', 'signout'],
};
```

## Type Safety Benefits

Invalid configurations will cause **compile-time errors**:

```typescript
// ❌ ERROR: Type '"gg"' is not assignable to type 'SearchEngine'
searchEngine: 'gg',

// ✅ CORRECT: Must use one of the valid values
searchEngine: 'brave', // or 'google', 'duckduckgo', 'bing'

// ❌ ERROR: Type '"invalid"' is not assignable to type 'ThemePreference'
themePreference: 'invalid',

// ✅ CORRECT
themePreference: 'dark', // or 'light', 'system'
```

## Notes

- Changes to this file require rebuilding the app
- TypeScript provides compile-time validation - invalid values will prevent the app from building
- At least one workspace must be defined
- Workspace IDs should be unique and start with `ws-`
- All enum values (search engine, theme, language, etc.) are strictly typed
