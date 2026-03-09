IA TODO

add a support button in settings that redirect to email drift.browser@gmail.com. also add the email contact where needed
also add "source code" to link to the github

screenshots 
app icon 

update defaults settings

claude security vuln check 

## Bugs

- [x] in the main bar, the 3 buttons are on the same size, on either side of the url, depending on the hand setting 

- [ ] over scrolling the top of the tab list should close it 
- [x] over scrolling the top of the url edition should close it
- [x] add button for "back in history" "forward in history" "refresh" actions
- [x] in fullscreen mode,the scroll action brings up the bottom bar, instead of the menu.
- [x] when no fullscreen, overscroll top will refresh the page
- [x] new tab open in the top of the list,open the tab list with the current tab in front, and put the new tab always on the top 
- [x] in the tab list, side swip to change workspace is only active on the tabs, it should be over the whole panel, while keeping the list scroll
- [x] can rotate the screen only for the website (like video or games) and keep the browser UI in portrait mode. You can allow the app to rotate, all ui will hide when in landscape, and only be used in portrait mode
- [x] the list of workspace should not be a scrollable list, put it in a flexbox, it will make rows of workspace, dont force them to take the full width.
- [x] remove the emoji from the workspace 
- [x] transparent mode is not saved like the other settings, it reset when restarting
- [x] system back action: when the url edition is open, close it, when the tab list is open, close it, when the menu is open, close it, if on the website, go back in history
- [ ] when closeing the app, if its in fullscreen mode, exit the fullscreen mode so when reopening the app, it will be in normal mode, and not stuck in fullscreen mode without any way to exit it
- [x] reduce time of animation for new tab url panel oppening
- [x] when pull overscroll for refresh, add a pull animation to explain whats going to happen

## Technical

- [x] "Extension 'esbenp.prettier-vscode' is configured as formatter but not available"

## Feature 

- [ ] a way to scroll to the top
- [ ] long click on any web link opens a panel like the menu, with options like "open in new tab", "copy link", "share link" (2 tiles should fit a row)
- [ ] add a git commit, version tag workflow to allow easier history understanding of the feature changes
- [ ] when sharing a link, open the native share menu with the current page link
- [ ] update readme and documentation recursively
- [x] add workspace edition for icon, color and name
- [ ] add a tab counter of the all app, it will be placed at the end of the workspace list
- [ ] add setting to export all data (bookmarks, history, workspaces, tabs, preferences) as a firefox understable format
- [ ] add setting to import data from a firefox understable format
- [ ] update the setting appearance section, add "theme" subsection

- [x] main bar should be: 1 plus, 1 menu, 1 workpsaced colored number of tabs and opens, 1 url, maybe back and forward
- [x] compact tab list toggle in appearance settings 
- [ ] add a setting "display full url in the main bar and the tab list"


- [x] check secrets and ready to push public
- [x] in readme, add doc link
- [ ] history page, add a "clear history" button, when clicking on a link in the history list, open the page and close the history page
- [ ] updated alerts (like in full screen mode) (material 3, ios glass)
- [ ] picture in picture mode for videos, with a toggle in the video right click menu, and a setting to always open videos in picture in picture mode
- [ ] remove the tabs count between workspace and list, but add a new workspacethat has all the tabs together, and put the number of tabs in it, and when clicking on it, open the tab list with all the tabs of all workspaces. when long click on it open a menu with "close all tabs" and "save all tabs as workspace" options

- [ ] add extension support with claude, make a second version of the app that only packs basic features to keep it lightest
- [ ] onboarding: choose language, choose theme, explain the main features of the app with a quick tutorial (swipe to change workspace, long click on a link, etc)