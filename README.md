# Drift

WARNING: This application has been developed by ai agents. It may contain bugs, security vulnerabilities, and other issues. Use at your own risk.

Technical setup and run instructions for the Expo/React Native workspace.

## Documentation

- User + development process guide: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- Git/versioning workflow: [docs/GIT_VERSIONING_WORKFLOW.md](docs/GIT_VERSIONING_WORKFLOW.md)

## Requirements

- Node.js 20+
- npm 10+
- Android Studio for Android SDK/emulator
- Xcode for iOS builds (macOS only)

## Install

```bash
npm install
```

## Run (Development)

Start Metro/Expo:

```bash
npm run start
```

Targets:

- Android: `npm run android`
- iOS (macOS): `npm run ios`
- Web: `npm run web`

## Type Check

```bash
npx tsc --noEmit
```

## Build

### EAS Cloud Builds (recommended)

```bash
npx eas login
npx eas build:configure
npx eas build --platform android
npx eas build --platform ios
```

### Local Native Builds

Android:

```bash
npx expo run:android
```

iOS (macOS):

```bash
npx expo run:ios
```

## Core Scripts

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`

## Stack

- Expo SDK 55
- React Native 0.83
- React 19
- TypeScript
- Zustand + AsyncStorage
- React Native WebView
- React Native Gesture Handler + Reanimated
- React Navigation

## Project Layout

```text
.
|- App.tsx
|- app.json
|- docs/
|  |- USER_GUIDE.md
|  |- GIT_VERSIONING_WORKFLOW.md
|  \- releases/
|- src/
|  |- components/
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

Clear Metro cache:

```bash
npx expo start -c
```

Reinstall dependencies:

```bash
npm install
```

Verify Reanimated plugin in `babel.config.js` if gesture animations fail.