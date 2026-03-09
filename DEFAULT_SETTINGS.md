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
Order of tiles in the menu panel. Array of `MenuTileId` type.

Available tiles (strongly typed):
- `"share"` - Share current page URL
- `"settings"` - Open settings
- `"workspace"` - Create new workspace
- `"signout"` - Sign out of Firefox account

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
  menuTileOrder: ['share', 'settings', 'workspace', 'signout'],
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
