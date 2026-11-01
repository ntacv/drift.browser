# Building Native Android and iOS Apps

Drift targets native Android and iOS only. It is a browser app built around a native WebView, not a browser-hosted web app; there is no supported Expo web target or `npm run web` command.

## Fresh Clone Setup

Install a Node.js version supported by the project's Expo SDK and restore the locked dependencies from the repository root:

```powershell
npm ci
npm test
npx expo install --check
```

The `android` and `ios` directories are generated and ignored by Git. Before invoking Gradle or opening a native project from a fresh clone, generate the required project with Expo Prebuild as described below. `npm run android` and `npm run ios` also generate a missing native project automatically before building a development app; `npm start` only starts Metro.

## Android Option 1: EAS Cloud Build (Recommended)

This is the easiest and most reliable way to build a release APK.

### Prerequisites
- EAS CLI installed
- EAS account (free tier available)

### Steps

1. Login to EAS:
```bash
npx eas login
```

2. Build production APK:
```bash
npx eas build --platform android --profile production
```

EAS generates the native project on its build servers when it is absent. Download the APK using the artifact link reported when the build completes.

## Android Option 2: Local Build (Advanced)

Requires proper Java and Android SDK configuration.

### Prerequisites
1. Java JDK 21 installed
2. Android SDK installed (usually at `C:\Users\<username>\AppData\Local\Android\Sdk`)
3. Environment variables set:
   - `JAVA_HOME=C:\Program Files\Java\jdk-21`
   - `ANDROID_HOME=C:\Users\<username>\AppData\Local\Android\Sdk`

### Steps

```powershell
# Set environment variables
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

# Generate the native Android project from the repository root first
npx expo prebuild --platform android

# Build
Set-Location android
.\gradlew assembleRelease
Set-Location ..
```

Find the APK under `android\app\build\outputs\apk\release`. Its filename and signing depend on the generated Gradle configuration. Configure production signing before distributing a locally built release; do not distribute an APK signed with a development/debug key.

### Setting Environment Variables Permanently (Windows)

1. Open System Properties > Advanced > Environment Variables
2. Add/edit system variables:
   - `JAVA_HOME`: `C:\Program Files\Java\jdk-21`
   - `ANDROID_HOME`: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`
3. Add to `Path`: `%JAVA_HOME%\bin` and `%ANDROID_HOME%\platform-tools`
4. Restart PowerShell/Terminal

## iOS Builds

For a local iOS build, use macOS with Xcode, its command-line tools, and CocoaPods installed. After `npm ci`, generate the native project from the repository root before opening it in Xcode:

```sh
npx expo prebuild --platform ios
npm run ios
```

`npm run ios` builds a development app. Use the generated Xcode workspace with your Apple signing team configured to archive a distribution build.

Alternatively, use EAS from Windows or macOS for a signed production build (Apple Developer credentials and provisioning are required):

```powershell
npx eas login
npm run release:ios
```

Local iOS compilation is not supported on Windows. EAS handles native project generation when the `ios` directory is absent.
