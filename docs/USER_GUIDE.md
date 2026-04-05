# Drift Browser - User Guide and Development Process

This document contains:

- User guide for day-to-day app usage
- Development process and architecture notes for contributors

## 1. User Guide

### 1.1 Main Controls

Bottom bar controls:

- `+`: create a new tab
- URL/domain pill: open URL editor
- Colored tab count button: open/close tab tray
- `...`: open/close menu sheet

In left-hand mode, the menu button is shown on the left side.

### 1.2 URL Editor Panel

Open by tapping the URL/domain pill.

Capabilities:

- Enter URL or search text
- Keyboard opens automatically when panel opens
- Suggestions/history list is shown below input
- `x` button clears current input
- `Close` button closes the panel

Close methods:

- Tap `Close`
- Drag the panel down using the handle area
- Tap outside (backdrop)
- Android hardware back button

### 1.3 Tabs and Workspaces

Gestures and actions:

- Swipe left/right on bottom bar: previous/next tab
- Swipe up on bottom bar: open tab tray
- Tap tab count button: toggle tab tray

Tab tray behavior:

- Vertical list of tabs in current workspace
- Tap tab to activate
- Tap close on a tab card to close
- Tap `+ New Tab` to create a new tab

Workspace behavior:

- Workspace chips at the top of tray
- Switch workspace without closing tray
- Swipe left/right on tab tray to switch workspace
- The "All Tabs" workspace chip shows all tabs from every workspace

#### Tab context menu

Long-press any tab card to open a context menu with:

- **Move to workspace** — pick a destination workspace from a sub-list
- **Duplicate** — create a copy of the tab in the same workspace
- **Copy URL** — copy the tab's URL to clipboard
- **Copy title** — copy the page title to clipboard
- **Pin / unpin** — toggle the pinned state (pinned tabs appear at the top)
- **Close tab** — close the tab

#### All-tabs workspace

The all-tabs chip (far left of workspace chips) aggregates every tab from every workspace.
Long-press it for quick actions:

- **Close all tabs** — close every open tab
- **Save all tabs as workspace** — collect all tabs into a new workspace

### 1.4 Menu Sheet

Menu is a bottom sheet and supports drag-to-close.
Tiles can be reordered by long-pressing a tile to enter drag mode, then tapping the destination tile.

Quick-action tiles (always visible):

- **Back** — navigate back in web history (disabled when unavailable)
- **Forward** — navigate forward in web history (disabled when unavailable)
- **Refresh** — reload the current page
- **Fullscreen** — toggle user fullscreen mode

Configurable tiles:

- **Share URL** — open the native share sheet with the current page URL
- **Settings** — open the settings screen
- **New workspace** — create a workspace with a default name and color
- **Sign out** — sign out of Firefox Account (shown only when signed in)

### 1.5 Settings Overview

#### Account

- Sign in / sign out of Firefox Account
- Language selection

#### Privacy

- Block trackers toggle
- Default search engine (Google, Brave, DuckDuckGo, Bing)

#### New Tabs

- Default new tab URL (text input or quick presets)

#### Tabs

- Left-hand mode
- Vertical tab list size (compact / comfortable / expanded)
- Compact tab list toggle (minimal card height)
- Compact workspace toggle (icon-only workspace chips)

#### Appearance

- Theme (system / dark / light)
- Transparent mode
- Website theme color (tints the top safe-area to match the active site's brand color)
- Hide bar on scroll
- Bar position (bottom / top)
- Display full URL

#### Support & About

- **Contact support** — opens `mailto:drift.browser@gmail.com`
- **Source code** — opens the GitHub repository

#### Data Management

- **Export data** — serialises all workspaces, tabs, history, bookmarks and preferences into a `drift-backup-<timestamp>.json` file and shares it via the native share sheet
- **Import data** — paste a previously exported Drift backup JSON to restore data

### 1.6 Workspace Editor

Each workspace can be customised. Long-press a workspace chip (or use the workspace editor button) to open the editor:

- **Name** — free text label
- **Color** — color picker to set the workspace accent color
- **Icon** — choose from a curated list of Material Icons

Changes take effect immediately and are persisted.

### 1.7 Fullscreen Modes

Drift Browser supports two types of fullscreen modes:

#### User Fullscreen

- Activated by tapping the fullscreen button in the menu sheet
- Hides the browser UI (URL bar, tab tray, menu)
- Removes top safe area for immersive viewing
- **Does not** change screen orientation
- Useful for distraction-free reading

Exit methods:
- Android hardware back button (highest priority)
- Pull down past the top of the webpage (overscroll)
- Tap the fullscreen button in menu again (if you can open menu)

#### Website Fullscreen

- Activated when a website requests fullscreen (e.g., YouTube videos, HTML5 games)
- Automatically locks screen to landscape orientation
- Hides all browser UI
- Enables fullscreen video playback

Exit methods:
- Android hardware back button (highest priority)
- Pull down past the top of the webpage (overscroll)
- Website's native fullscreen exit button

**Note**: Both fullscreen modes can be active simultaneously, though this is rare.

### 1.8 Screen Rotation

Screen rotation behavior:

- **Default**: Free rotation enabled (portrait and landscape)
- **In website fullscreen**: Locked to landscape orientation
- **In user fullscreen**: Free rotation maintained
- **UI behavior in landscape**: Browser UI automatically hides when device is rotated to landscape (width > height)

The automatic UI hiding in landscape provides a clean viewing experience for wide content without requiring manual fullscreen activation.

### 1.9 Android Back Button Priority

The Android hardware back button follows this priority order:

1. **Exit user fullscreen** - If user activated fullscreen via menu
2. **Exit website fullscreen** - If website requested fullscreen
3. **Close URL overlay** - If URL editor is open
4. **Close settings** - If settings screen is open
5. **Close menu sheet** - If menu is open
6. **Close tab tray** - If workspace/tab panel is open
7. **Navigate back in web history** - If current tab can go back
8. **Exit app** - Let system handle (double-tap to exit)

This priority ensures a predictable and intuitive navigation experience.

## 2. Development Process Explanation

### 2.1 Architecture Overview

Primary layers:

- UI shell components: `src/components/shell/`
- Browser/webview components: `src/components/browser/`
- State and actions: `src/store/`
- Shared hooks and gesture logic: `src/hooks/`
- Theme and i18n: `src/theme/`, `src/i18n/`

Key pattern:

- App-level state is centralized in Zustand store
- UI components subscribe to minimal slices of state
- Gesture behaviors are extracted to reusable hooks (for example `useSheetGesture`)

### 2.2 State and Persistence

State is managed in `browserStore` and persisted using AsyncStorage.

Persisted domains include:

- Tabs/workspaces
- History/bookmarks
- Preferences and UI state

When adding new persisted fields:

1. Add schema/default values in store
2. Add migration handling if format changes
3. Verify hydration behavior on cold app start

### 2.3 Gesture-Driven Sheet Process

Bottom sheets (menu, tab tray, URL editor) should follow the same lifecycle:

1. Boolean open state in store or local state
2. `useSheetGesture` for animated `translateY`
3. Handle area for close drag affordance
4. Backdrop press closes the sheet
5. Android hardware back closes topmost sheet first

For input sheets (URL editor):

- Focus input when opening
- Dismiss keyboard when closing

### 2.4 Feature Development Workflow

Recommended loop for each feature/fix:

1. Implement minimal code change
2. Type-check: `npx tsc --noEmit`
3. Test on Android with `npm run android` (or Expo Go path)
4. Validate gesture edge cases and back button behavior
5. Update docs when behavior changes

### 2.5 Release and Versioning Process

Use the detailed workflow in `docs/GIT_VERSIONING_WORKFLOW.md`.

High-level release flow:

1. Merge to `main`
2. Bump version metadata
3. Create and push `vX.Y.Z` tag
4. CI builds artifacts and publishes release assets

### 2.6 Debugging Checklist

When behavior is incorrect:

1. Type-check: `npx tsc --noEmit`
2. Clear Metro cache: `npx expo start -c`
3. Reinstall dependencies if needed: `npm install`
4. Validate gesture boundaries in affected sheet component
5. Confirm keyboard focus/dismiss behavior on Android device

### 2.7 Fullscreen and Rotation Implementation

#### State Management

Two separate fullscreen states are tracked:

1. **`isUserFullscreen`** (global state in `browserStore`)
   - Toggled by menu button
   - Hides UI but preserves orientation settings
   - Persisted across app restarts

2. **`tab.webContentFullscreen`** (per-tab state)
   - Set by WebView Fullscreen API interception
   - Triggers landscape orientation lock
   - Not persisted (tab-specific runtime state)

#### Orientation Control

Managed via `expo-screen-orientation`:

- **Website fullscreen**: `ScreenOrientation.lockAsync(LANDSCAPE)`
- **Outside website fullscreen**: `ScreenOrientation.unlockAsync()` (allows free rotation)
- Android requires `screenOrientation="sensor"` in `AndroidManifest.xml`
- iOS requires `UISupportedInterfaceOrientations` array in `app.json`

#### UI Visibility Logic

UI components (URL bar, tab tray, menu) are hidden when:

```typescript
const shouldHideUI = isUserFullscreen || isWebContentFullscreen || isLandscape;
```

This provides automatic landscape UI hiding for better viewing experience.

#### WebView Fullscreen API Bridge

The `useWebView` hook injects JavaScript that intercepts:

- `Element.requestFullscreen()` → posts `fullscreenEnter` message
- `Document.exitFullscreen()` → posts `fullscreenExit` message
- WebKit prefixed variants (`webkitRequestFullscreen`, etc.)

The WebViewWrapper listens for these messages and updates `tab.webContentFullscreen` accordingly.

#### Back Button Handling

Implemented in `BrowserScreen.tsx` using `BackHandler.addEventListener`:

- Uses `useIsFocused()` hook to prevent handling when screen is not active
- Checks each priority condition in order
- Returns `true` to consume the event, `false` to let system handle
- Settings screen has its own focused back handler to navigate back

This architecture ensures fullscreen modes work correctly across different content types while maintaining user control.

### 2.8 Data Transfer (Export / Import)

Implemented in `src/services/dataTransferService.ts`.

#### Export

`createBackupJson(state)` serialises a snapshot of the store into a `DriftBackupFile` object:

```json
{
  "schema": "drift.backup.v1",
  "exportedAt": <timestamp>,
  "app": "drift-browser",
  "data": { /* workspaces, tabs, history, bookmarks, preferences */ }
}
```

The file is written to the Expo cache directory and shared via the native share sheet.

#### Import

`parseBackupJson(raw)` validates the schema and returns the parsed backup.
`buildImportedState(current, imported)` merges the imported data with sensible fallbacks:

- Orphaned tabs receive a fallback workspace.
- Workspaces with no valid tabs receive a blank tab.
- All runtime-only flags (`isMenuOpen`, `isTrayOpen`, `isUserFullscreen`, etc.) are reset to `false`.

When adding new persisted fields that must survive an import cycle, update `pickPersistedData` and `buildImportedState` accordingly.

### 2.9 Menu Tile Layout

Tiles in the menu sheet use a column-fraction system (`tileFrameStyle` in `MenuSheet.tsx`):

- The tile area is divided into `TILE_SPAN_COUNT = 4` equal columns.
- `s` tiles span 1 column (4 per row), `m` span 2 (2 per row), `l` span all 4 (full row).
- Quick-action tiles (back, forward, refresh, fullscreen) are always `s` and pinned to the top row.
- Configurable menu tiles default to `m`.

Long-press a configurable tile to enter drag mode; tap another tile to swap positions.

## 3. Related Documentation

- Technical run/build instructions: `README.md`
- Release and tag workflow: `docs/GIT_VERSIONING_WORKFLOW.md`
- Version notes: `docs/releases/`
- Remaining work and backlog: `ai_todo.md`
