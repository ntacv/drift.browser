# Zen Mobile Browser POC - User Guide

This guide explains how to use each feature currently available in the app.

## Table of Contents

- Getting Started
- Main Browser Controls
- URL Editor
- Tabs and Workspaces
- Fullscreen Mode
- Menu Tiles
- Settings
- Gestures Summary
- Troubleshooting

## Getting Started

1. Launch the app.
2. Use the bottom URL bar to browse, manage tabs, and open menu/settings.
3. Open Settings to configure language, tab list size, and preferred behavior.

## Main Browser Controls

The bottom bar contains:

- `+` Create a new tab
- URL/domain pill: Open URL editor
- Tab count button: Open tab tray
- Menu button (`...`): Open menu sheet

In left-hand mode, the menu button is moved to the left side.

## URL Editor

Open URL editor by tapping the URL/domain pill.

Capabilities:

- Enter full URLs or search text
- View recent history suggestions
- Clear input with `x` button
- Submit to navigate active tab

Close URL editor by:

- Tapping `Close`
- Swiping up or down on the editor header
- Tapping outside the sheet
- Pressing Android device back button

## Tabs and Workspaces

### Tab navigation

- Swipe left/right on the bottom URL bar to switch to next/previous tab.
- Swipe up on bottom URL bar to open vertical tab tray.

### Tab tray

- Vertical list of tabs in active workspace
- Always-visible close-tab button on each tab row
- `+ New Tab` button at end of list
- Adjustable tray size from settings:
  - `compact`
  - `comfortable`
  - `expanded` (full-height tray)

Behavior notes:

- Switching workspaces from tray does not close the tray.
- Scrolling the background webpage while tray is open closes the tray.

### Workspaces

Default workspaces:

- Personal
- Work
- Research

In tray:

- Tap workspace chip to switch workspace.
- Swipe tab row left/right to move between workspace contexts quickly.

## Fullscreen Mode

Open Menu -> `Fullscreen`.

When enabled:

- Browser chrome is minimized
- System status bar is hidden
- Website content extends to top edge

To access menu again in fullscreen:

- Pull down beyond top of webpage (overscroll gesture)

## Menu Tiles

Menu actions are displayed as tiles with Material icons.

Common actions:

- Bookmark active tab
- Share URL
- Open Settings
- Create Workspace
- Toggle Fullscreen
- Reorganize Tiles
- Sign Out (when signed in)

### Reorganize menu tiles

1. Open Menu.
2. Tap `Reorganize Tiles`.
3. Use left/right controls under each tile to move position.
4. Tap `Done Reordering`.

Tile order is persisted.

## Settings

Settings are grouped into sections:

### Account

- Sign in/out (Firefox auth scaffold)
- Shows sync status and last sync timestamp

### Privacy

- Toggle tracker blocking
- Select default search engine (`brave`, `duckduckgo`, `google`, `bing`)

### New Tabs

- Set default new tab URL
- Quick presets available
- Optional blank mode behavior:
  - Leave default new tab field empty
  - New tabs open blank page
  - URL editor opens automatically with keyboard
  - Blank page follows current theme

### Tabs

- Left hand mode toggle
- Vertical tab list size selector

### Appearance

- Language: `EN` or `FR`
- Theme: `system`, `dark`, `light`

## Gestures Summary

- URL bar swipe left/right: next/previous tab
- URL bar swipe up: open tab tray
- URL editor header swipe up/down: close editor
- Tab row swipe left/right: switch workspace
- Fullscreen top overscroll: reopen menu

## Troubleshooting

### URL panel does not close

- Try swiping on the panel header (not suggestion list area).
- On Android, use hardware back button.

### Tab tray closes unexpectedly

- Background webpage scrolling closes tray by design.

### Language did not update expected text

- Core screens are localized first; some labels may still be in default language if not yet mapped.

### Build/type issues

Run:

```bash
npm install
npx tsc --noEmit
```
