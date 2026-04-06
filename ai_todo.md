# AI TODO

## Done

- [x] app icon (configured with adaptive Android icon + iOS icon)
- [x] claude security vulnerability check
- [x] screenshots in docs/images
- [x] support button in settings → email drift.browser@gmail.com
- [x] source code link in settings → https://github.com/ntacv/drift.browser
- [x] retrieve website color theme and update top safe zone color
- [x] compact workspace mode (icon-only chips, compact appearance setting)
- [x] scroll down animation to hide bar (`hideBarOnScroll` setting)
- [x] setting to remove fullscreen alert (`hideFullscreenAlert`)
- [x] long press tab → context menu: change workspace, duplicate, copy URL, copy title
- [x] in the main bar, the 3 buttons are uniform, respecting left/right-hand setting
- [x] overscrolling the top of the URL editor closes it
- [x] add back / forward / refresh buttons in the menu
- [x] in fullscreen mode, scroll action shows menu (not the bottom bar)
- [x] when not in fullscreen, overscroll top refreshes the page
- [x] new tab opens at top of list; tab list opens with the active tab in view
- [x] side swipe to change workspace covers the whole tab tray panel
- [x] screen can rotate for websites (video/games); browser UI stays portrait-only
- [x] workspace list is a flexbox wrap, not a scrollable list
- [x] emoji removed from workspaces (replaced by MaterialIcons)
- [x] transparent mode is now persisted correctly
- [x] Android back button priority: URL editor → tab tray → menu → web history
- [x] reduced animation time for new tab URL panel opening
- [x] pull-to-refresh overscroll animation
- [x] updated default settings
- [x] share current page URL via native share sheet
- [x] workspace edition (icon, color, name)
- [x] main bar layout: `+`, menu, workspace-colored tab count, URL bar
- [x] compact tab list toggle in appearance settings
- [x] "display full URL" setting in appearance
- [x] all-tabs workspace (shows all tabs across workspaces; long press → close all / save as workspace)
- [x] menu tiles use fractional width: `s` = ¼ row, `m` = ½ row, `l` = full row
- [x] export all data (bookmarks, history, workspaces, tabs, preferences) as Drift backup JSON
- [x] import Drift backup JSON
- [x] git commit / version tag workflow documented (docs/GIT_VERSIONING_WORKFLOW.md)
- [x] README has documentation links
- [x] check secrets, ready to push public
- [x] prettier-vscode extension warning resolved

---

## Bugs — Remaining

- [ ] overscrolling the top of the tab list should close it
- [ ] when closing the app in fullscreen mode, exit fullscreen so that on next launch the app is not stuck (no UI controls visible)

---

## Features — Remaining

### High priority

- [x] history page: dedicated screen showing browsing history, "clear history" button, tapping an entry opens the page
- [x] long press on any web link: panel with "open in new tab", "copy link", "share link" (2 tiles per row)
- [x] error pages: when WebView hits ERR_CONNECTION_REFUSED, ERR_UNKNOWN_URL_SCHEME or other common errors, show a friendly error page with a retry button

### Medium priority

- [ ] invert URL bar swipe direction (setting)
- [ ] long press on URL bar → copy URL with a toast pill that animates from the bar
- [ ] update the Appearance settings section: group theme (dark/light/system), transparency, website theme color and bar position under a "Theme" subsection
- [ ] updated alerts (Material 3 / iOS glass style — replace plain `Alert.alert` in fullscreen and other flows)

### Low priority / Future

- [ ] drag and drop tabs and workspaces
- [ ] picture-in-picture mode for videos (toggle in video long-press menu; setting to always use PiP)
- [ ] onboarding flow: choose language, choose theme, quick tutorial (swipe to change workspace, long press a link, etc.)
- [ ] extension support (second lightweight app variant)
- [ ] typography refinement (Drift brand, digits, personal settings use cases)
- [ ] firefox sync analysis and potential implementation
