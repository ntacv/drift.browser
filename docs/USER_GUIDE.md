# Zen Mobile Browser - User Guide and Development Process

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
- Swipe on tab cards to change workspace context

### 1.4 Menu Sheet

Menu is a bottom sheet and supports drag-to-close.

Current actions include:

- Share URL
- Open settings
- Create workspace
- Toggle fullscreen
- Sign out (if signed in)

### 1.5 Settings Overview

Settings include:

- Search engine
- Default new tab URL
- Tracker blocking toggle
- Tab list size
- Left-hand mode
- Language
- Theme

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

## 3. Related Documentation

- Technical run/build instructions: `README.md`
- Release and tag workflow: `docs/GIT_VERSIONING_WORKFLOW.md`
- Version notes: `docs/releases/`
