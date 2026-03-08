# Building Release APK

## Option 1: EAS Cloud Build (Recommended)

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

The build will run on EAS servers and download the APK when complete.

## Option 2: Local Build (Advanced)

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

# Build
cd android
.\gradlew assembleRelease
cd ..
```

The APK will be at: `android\app\build\outputs\apk\release\app-release-unsigned.apk`

### Setting Environment Variables Permanently (Windows)

1. Open System Properties > Advanced > Environment Variables
2. Add/edit system variables:
   - `JAVA_HOME`: `C:\Program Files\Java\jdk-21`
   - `ANDROID_HOME`: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`
3. Add to `Path`: `%JAVA_HOME%\bin` and `%ANDROID_HOME%\platform-tools`
4. Restart PowerShell/Terminal
