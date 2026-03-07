# Zen Mobile Browser (Made with AI)

A gesture-first mobile browser proof of concept built with Expo + React Native.

This project focuses on a modern browser shell experience:
- Workspace-based tab organization
- Vertical tab tray
- Fast URL entry and history suggestions
- Optional fullscreen browsing mode
- Left-hand mode layout option
- Language support (English/French)
- Reorderable menu tiles with Material icons
- Themed UI (light/dark/system)
- Local persistence (tabs, settings, history, bookmarks)

## Table of Contents

- Overview
- Download the App (Releases)
- Quick Start (Run Locally)
- Build the App
- Project Scripts
- How to Use the App
- Features Documentation
- User Documentation
- Git and Versioning Workflow
- Tech Stack
- Project Structure
- Troubleshooting
- Contributing
- License

## Overview

Zen Mobile Browser POC is a React Native app designed to test a mobile-first browser UX.

Key ideas:
- Bottom URL bar as the central interaction point
- Gesture interactions for tabs and tray
- Workspace model to separate contexts (Personal, Work, Research)
- Smooth transition between browsing and tab management

## Download the App (Releases)

If you just want to install and test, use GitHub Releases.

1. Go to the repository Releases page.
2. Download the latest build artifacts.
3. Install based on your platform:

- Android:
  - Download `.apk` (or `.aab` if your release process provides Play-distributed bundles).
  - Enable installation from unknown sources if required.
  - Open the APK on your device and install.
- iOS:
  - Use TestFlight invite/build from the release notes when available.

If your repository does not yet publish binaries, follow the build steps below.

## Quick Start (Run Locally)

### Prerequisites

- Node.js 20+ recommended
- npm 10+
- Android Studio (for Android emulator/device builds)
- Xcode (for iOS simulator/device builds, macOS only)
- Expo CLI via `npx expo` (no global install required)

### Install

```bash
npm install
```

### Start development server

```bash
npm run start
```

Then open:
- Android emulator/device: press `a` in Expo terminal or run `npm run android`
- iOS simulator/device (macOS): press `i` or run `npm run ios`
- Web preview: `npm run web`

## Build the App

This project can be built with either EAS Build (recommended for distribution) or local native builds.

### Option A: EAS Build (recommended for release)

1. Login and configure EAS:

```bash
npx eas login
npx eas build:configure
```

2. Create builds:

```bash
npx eas build --platform android
npx eas build --platform ios
```

3. Download artifacts from EAS dashboard or attach them to GitHub Releases.

### Option B: Local native build

Android:

```bash
npx expo run:android
```

iOS (macOS only):

```bash
npx expo run:ios
```

## Project Scripts

From `package.json`:

- `npm run start`: Start Expo dev server
- `npm run android`: Launch Android target from Expo
- `npm run ios`: Launch iOS target from Expo
- `npm run web`: Launch web preview

## How to Use the App

### Main Browser Screen

- The website fills the main viewport.
- Bottom URL bar is your primary control strip.
- Bottom controls include:
  - New tab (`+`)
  - URL/domain pill
  - Tab count button
  - Menu button (`...`)

### Open and Use URL Input

- Tap the URL/domain pill to open address editing.
- Type URL or search text, then submit.
- History suggestions appear below the input.
- On Android, pressing the device back button closes the URL panel if it is open.
- Close methods:
  - Tap `Close`
  - Swipe up or down in the overlay header zone
  - Tap outside the sheet backdrop
- Input tools:
  - Right-side `x` button clears current text

### Tab Navigation and Management

- Swipe left/right on the main URL bar to move to next/previous tab.
- Swipe up on main URL bar to open vertical tab tray.
- Vertical tab tray:
  - Shows tabs as a scrollable vertical list
  - Always shows close-tab button per row
  - Tray remains open while switching workspaces
  - Scrolling the background webpage dismisses tray
  - Tap a tab to switch
  - Tap `+ New Tab` at bottom to create a tab

### Workspaces

- Tabs are grouped by workspace (Personal, Work, Research by default).
- In tab tray, workspace chips appear at the top.
- Swipe on a tab row left/right to switch workspace quickly.

### Fullscreen Mode

- Open menu and enable fullscreen.
- In fullscreen:
  - Browser UI overlays are minimized
  - System status bar is hidden
  - Web content reaches top of the screen
- To reopen controls/menu in fullscreen, use top overscroll gesture behavior in the webpage.

### Settings

Settings include:
- Account sign-in/out (Firefox account flow scaffold)
- Tracker blocking toggle
- Default search engine
- Default new tab page
- Language setting (`EN`, `FR`)
- Tab list size (`compact`, `comfortable`, `expanded`)
- Left hand mode toggle
- Theme preference
- Menu tile reordering mode

Default New Tab behavior:
- If default new tab value is a URL, new tabs open that URL.
- If set to `about:blank`, tabs open a blank page.
- If left empty:
  - New tabs open a blank page
  - URL editor opens automatically
  - Keyboard is focused for immediate typing
  - Blank page respects app theme (dark in dark mode)

## Features Documentation

### 1) URL + Search Handling

- Input is normalized to URL or search query based on selected engine.
- Suggestions use recent browsing history.

### 2) Persistent Browser State

Stored locally:
- Workspaces and tab tree
- Active tab/workspace
- Bookmarks and history
- Preferences (theme, search engine, language, tracker blocking, default new-tab URL, fullscreen, tab list size, left-hand mode, menu tile order)

### 3) WebView Bridge

Injected page script communicates:
- Favicon discovery
- Scroll position updates
- Overscroll events used by shell interactions

### 4) Tracker Blocking (POC level)

- Uses host-based checks for selected known trackers.
- Current approach primarily affects navigations and is intentionally simple for POC scope.

### 5) Theming

- `system`, `dark`, and `light` modes
- Shared design tokens for backgrounds, surfaces, text, accents, and spacing

### 6) Menu Tiles

- Menu actions are shown as tiles with Google Material icons.
- Tile order can be reorganized from inside the menu via `Reorganize Tiles`.
- Reordered layout is persisted across app restarts.

## User Documentation

Detailed end-user documentation is available at:

- `docs/USER_GUIDE.md`

## Git and Versioning Workflow

To keep feature history understandable and releases traceable:

- Follow commit and tagging guide: `docs/GIT_VERSIONING_WORKFLOW.md`
- Review release notes/checklist for current version: `docs/releases/v1.1.0.md`
- Use semantic version tags like `vX.Y.Z`
- Push tags to trigger automatic GitHub Releases (release notes are generated from history)

Release workflow file:

- `.github/workflows/release-on-tag.yml`

Packaged release artifacts:

- On each pushed version tag (`v*.*.*`), CI builds:
  - Android `.apk`
  - iOS `.ipa`
- Both files are attached to the GitHub Release automatically.

Required GitHub secret for CI builds:

- `EXPO_TOKEN`: Expo token with access to the EAS project

## Tech Stack

- Expo SDK 55
- React Native 0.83
- React 19
- TypeScript
- Zustand + AsyncStorage persistence
- React Navigation
- React Native WebView
- Gesture Handler + Reanimated
- Safe Area Context
- Expo Vector Icons (Material Icons)

## Project Structure

```text
.
|- App.tsx
|- app.json
|- docs/
|  \- USER_GUIDE.md
|- src/
|  |- components/
|  |  |- browser/
|  |  \- shell/
|  |- hooks/
|  |- i18n/
|  |- screens/
|  |- services/
|  |- store/
|  |- theme/
|  \- types/
\- package.json
```

## Troubleshooting

### Metro or Babel preset errors

```bash
npm install
npx expo start -c
```

### Type-check project

```bash
npx tsc --noEmit
```

### WebView or gesture oddities

- Close and relaunch Metro.
- Rebuild app after native dependency updates.
- Confirm `react-native-reanimated` plugin is present in `babel.config.js`.

## Contributing

1. Fork and create a feature branch.
2. Keep PRs focused and small.
3. Run type checks before opening PR:

```bash
npx tsc --noEmit
```

4. Add screenshots or short clips for UI/gesture changes.

## License

Choose and add a license file if this repository is public (for example MIT).