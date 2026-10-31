# Native Android Picture-in-Picture Implementation Plan

Status: proposed; implementation and device validation have not started.

Target branch: `copilot/fix-picture-in-picture-functionality`.

## Goal and reported failure

Provide manual, video-focused Android PiP from Drift's menu, with playback continuing while the user switches apps and normal browsing restored when the window is expanded.

Reported environment: Pixel 9, Android 17, Expo Go, a YouTube video page. The current menu script stops when `document.pictureInPictureEnabled` is false. It never reaches video selection. The Android implementation must not depend on that webpage API becoming available.

The existing [Android plugin](../plugins/withAndroidPip.js) only declares activity support. Expo Go cannot incorporate that plugin or a new native module. A custom native build is required, but is not by itself the complete implementation.

## Proposed scope

- Manual entry from the existing menu action; native capability and video-readiness checks before entry.
- Native mode events, video-only presentation, playback continuity, and reliable restoration.
- Clear messages for Expo Go, unsupported devices, unavailable video, disabled system permission, and failed requests.
- Preserve the existing non-Android behavior and unrelated fullscreen/navigation behavior.
- Initially exclude automatic entry on Home, custom media controls, a second player, video-stream extraction, and bypassing site restrictions. These are separate follow-ups, not prerequisites for manual PiP.
- Android activity PiP pins the current activity. Browsing a different tab inside Drift while retaining a separate floating player is not part of this first version.

## 1. Prove the native video path before committing to an integration

Use the installed Expo SDK and React Native WebView versions, and a custom Android build on the reported Pixel 9.

1. Trace WebView fullscreen custom-view ownership (`onShowCustomView` / `onHideCustomView`) and the host activity's pause/resume behavior. Confirm what actually renders when the activity enters PiP.
2. Prototype manual `enterPictureInPictureMode(PictureInPictureParams)` using a local Expo module. Check API level, `FEATURE_PICTURE_IN_PICTURE`, activity availability/state, and system permission where observable.
3. First validate a controlled top-level HTML5 video, then a YouTube watch page and a YouTube embedded player. Exercise both inline and website-fullscreen playback.
4. Prefer the existing fullscreen video/custom view as the PiP content. Establish whether a native menu tap can prepare that surface; injected JavaScript must not be assumed to grant webpage user activation or access cross-origin iframe video.
5. If entering video fullscreen programmatically is rejected, require the user to start/fullscreen the video first and design an accessible native entry affordance. If the existing WebView does not expose the required surface/lifecycle hooks, compare a maintained integration with a narrow, reproducible WebView patch before expanding implementation scope.

**Go/no-go gate:** demonstrate moving video and audio in an OS PiP window, not a miniature browser page or a frozen/black view. Document the supported player cases and any prerequisite user gestures. Do not call Android PiP complete if only activity entry works. If YouTube fails, report the observed blocker rather than promising support from manifest flags.

## 2. Add a reproducible native bridge and build setup

- Scaffold a local Android Expo module with the official local-module generator. Keep source under `modules`; do not depend on manual edits to generated native files.
- Define a small typed bridge: capability/status query, asynchronous entry request, and native mode-change events. Return structured failure reasons rather than treating a request as success.
- Use optional module loading so Expo Go and non-Android platforms can launch without crashing. Expo Go should show an explicit custom-build-required message instead of running the Android webpage PiP script.
- Extend [withAndroidPip.js](../plugins/withAndroidPip.js) as needed to preserve existing manifest configuration and merge the required activity `configChanges` flags. Verify idempotence and activity-name handling against generated output.
- Connect activity mode-change callbacks using SDK-supported lifecycle integration. If a generated activity modification is necessary, make it a tested, idempotent config-plugin change compatible with the actual Expo activity template.
- Validate/clamp video aspect ratios and supply a `sourceRectHint` only when trustworthy native bounds are available. Guard version-specific APIs. Keep automatic entry disabled for this scope.
- Add a development-client build profile to [eas.json](../eas.json) and the corresponding dependency only when implementing that workflow. The existing preview APK is also a valid custom binary for acceptance testing.
- Verify a fresh native generation/build includes and autolinks the module. Perform destructive clean-prebuild experiments in an isolated checkout, not over unrelated local native edits.

**Deliverable:** a reproducibly built Android app with a capability-aware native PiP bridge and verified callback delivery.

## 3. Route the action through a single platform-aware controller

Primary integration points: [MenuSheet.tsx](../src/components/shell/MenuSheet.tsx), [UrlBar.tsx](../src/components/shell/UrlBar.tsx), [WebViewWrapper.tsx](../src/components/browser/WebViewWrapper.tsx), [useWebView.ts](../src/hooks/useWebView.ts), and [browserStore.ts](../src/store/browserStore.ts).

- Route Android requests to the native controller; do not check `document.pictureInPictureEnabled` as an Android-native capability gate.
- Keep the current standard/WebKit path for non-Android platforms, with platform regression coverage before consolidating its behavior.
- Use explicit transient states such as unavailable, idle, preparing, entering, active, exiting, and failed. Native callbacks, not resolved request promises, are the source of truth for active mode.
- Bind a request to its originating tab. Serialize/deduplicate taps, reject stale preparation results, and cancel when that tab closes or navigates. Do not replay entry on remount, app restart, or backup import.
- Prefer direct commands and transient state over the two persisted request counters. If compatibility requires counters during transition, initialize them defensively and normalize both hydration and all imported tab records, not only fallback tabs. Add an old-backup regression test.
- Give the menu icon an accessibility label using the existing translations. Expose capability/readiness or explain why entry is unavailable; include localized user-facing failure messages rather than console-only warnings.
- Keep the Android URL-bar button hidden initially to avoid adding a second entry point before the menu path is validated.

**Deliverable:** one Android request flow with safe Expo Go behavior, no stale requests, and visible failure feedback.

## 4. Handle video presentation and lifecycle correctly

- Preserve the active WebView/player instance; do not extract YouTube streams or replace its player.
- Coordinate PiP-specific UI with [BrowserScreen.tsx](../src/screens/BrowserScreen.tsx): hide browser chrome, sheets, and overlays during entry and active PiP; restore prior presentation on return. Do not equate PiP with user fullscreen.
- Reconcile website-fullscreen orientation locking with PiP configuration changes. Use native transition callbacks where available so hiding UI does not rely solely on delayed JavaScript events.
- Verify the installed WebView's pause/resume behavior. Keep playback alive while in PiP without globally disabling normal background pause behavior. Define and test cleanup when the user dismisses the PiP window.
- Handle expand-to-app, system dismissal, permission revocation, activity recreation, navigation, and app termination. Native subscriptions and player references must be cleaned up.
- Use system PiP controls for expand/close. Do not assume Android offers a symmetric equivalent of `document.exitPictureInPicture()`; explicitly design any in-app exit action around supported activity behavior.

**Deliverable:** a video-focused window with correct audio, restoration, and cleanup—not merely successful entry into activity PiP.

## 5. Validation and acceptance criteria

### Automated checks

- Unit tests for native-unavailable/Expo Go behavior, platform routing, duplicate taps, state transitions, stale tab requests, and error mapping.
- Store/import tests for older backups and prevention of entry replay after restart/import.
- Plugin fixture tests for manifest preservation, required attributes, and repeated application; test generated activity changes if needed.
- Existing regression tests and TypeScript checking, starting with the directly affected selectors. Native compilation and native tests for added Android code.

### Device matrix

| Case | Expected result |
|---|---|
| Pixel 9 / Android 17 / Expo Go | No crash; actionable custom-build-required message |
| Same device / custom build / controlled HTML5 video | Video and audio continue in native PiP; expand and dismiss work |
| Same device / YouTube watch page | Verified moving video/audio, or an explicit documented blocker; no claim of support without this test |
| YouTube embedded player / cross-origin iframe | Supported via verified native surface or rejected clearly; no assumption of DOM access |
| No video, paused/unready video, or restricted player | Deterministic behavior and useful feedback; no empty PiP window |
| Multiple videos or rapid repeated taps | One intended player/request; no duplicate transitions |
| Home/app switching, rotation, expand, dismissal | Correct presentation, orientation, playback and cleanup |
| Closed/navigated tab, restart, older backup import | No stale PiP entry or invalid request counter |
| PiP disabled in Android settings | Clear failure and restored normal UI |
| Another supported Android version/device | No unsupported API calls or device-specific assumptions |
| iOS custom build | Existing URL-bar/WebKit behavior and fullscreen remain unchanged |

Record device/OS, app build, WebView version, player/page, and observed results. Android-only automation cannot certify iOS or YouTube device behavior.

## 6. Documentation and delivery

1. Complete the proof-of-concept gate and record evidence before broad UI work.
2. Deliver native module/plugin/build support, then controller/presentation integration, then regression coverage and acceptance testing.
3. Update [USER_GUIDE.md](./USER_GUIDE.md) and [README.md](../README.md) with actual supported cases, custom-build instructions, Expo Go limitations, and remaining restrictions.
4. Keep changes on the feature branch for review. Do not mark support complete until a newly built app passes the relevant device criteria.

## References

- [Android: Add support for picture-in-picture](https://developer.android.com/develop/ui/views/picture-in-picture) — activity registration, entry, transitions, and playback lifecycle.
- [Expo: Create a local module](https://docs.expo.dev/modules/get-started/) — app-local native module workflow.
- [Current implementation and limitations](./USER_GUIDE.md#210-picture-in-picture-implementation).
