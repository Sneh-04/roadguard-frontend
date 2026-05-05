# RoadGuard Mobile App - Comprehensive Setup & Build Guide

## Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- Android Studio with Android SDK (API 21+)
- JDK 11 or higher
- Gradle 7.3+

### 5-Minute Setup

```bash
# 1. Navigate to mobile app directory
cd mobile/offlineapp

# 2. Install dependencies
npm install

# 3. Start Metro bundler
npm start

# 4. In another terminal, run on Android device/emulator
npm run android
```

That's it! The app will compile and run on your connected device or emulator.

---

## Detailed Installation Instructions

### Step 1: Set Up Development Environment

#### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and JDK
brew install node@18
brew install openjdk@11

# Set JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 11)' >> ~/.zshrc
```

#### Ubuntu/Linux

```bash
# Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install JDK 11
sudo apt install default-jdk

# Install other dependencies
sudo apt install -y build-essential libssl-dev
```

#### Android Studio Setup

1. Download and install Android Studio from https://developer.android.com/studio
2. Open Android Studio and install:
   - Android SDK API 34 (latest)
   - Android SDK Build Tools 34.0.0
   - Android Emulator
   - NDK (Side by side)

3. Configure environment variables:

**macOS/Linux (.zshrc, .bashrc, or .bash_profile):**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$JAVA_HOME/bin
```

**Windows (System Environment Variables):**
```
ANDROID_HOME: C:\Users\YourUsername\AppData\Local\Android\sdk
NDK_HOME: C:\Users\YourUsername\AppData\Local\Android\sdk\ndk\25.2.9519653
JAVA_HOME: C:\Program Files\Java\jdk-11
```

### Step 2: Clone and Install Project

```bash
# Navigate to project
cd /path/to/RoadGuard_Final/mobile/offlineapp

# Install npm dependencies
npm install

# Verify installation
npm list react-native
```

### Step 3: Configure Android

#### Update Gradle Version (Optional - Skip if already latest)

Edit `android/gradle/wrapper/gradle-wrapper.properties`:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.1-all.zip
```

#### Create Debug Keystore (First Time Only)

```bash
cd android/app

# Generate debug keystore
keytool -genkey -v -keystore debug.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias androiddebugkey -keypass android -storepass android \
  -dname "CN=localhost"

cd ../..
```

### Step 4: Run Development Build

#### Method 1: Using npm (Recommended)

```bash
# Start Metro bundler (Terminal 1)
npm start

# In Terminal 2, run on device/emulator
npm run android
```

**Output**: App should appear on device/emulator within 30-60 seconds

#### Method 2: Using React Native CLI

```bash
# Start Metro bundler
react-native start

# In another terminal
react-native run-android
```

#### Method 3: Using Android Studio

1. Open Android Studio
2. Select "Open an existing Android Studio project"
3. Navigate to `mobile/offlineapp/android`
4. Click "Open"
5. Wait for Gradle sync to complete
6. Click "Run" (green play button) or press Shift+F10
7. Select your device/emulator

---

## Building for Production

### Generate Release APK

```bash
cd mobile/offlineapp/android

# Build release APK
./gradlew clean assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Generate Release AAB (Google Play)

```bash
cd mobile/offlineapp/android

# Build release AAB
./gradlew clean bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Sign Release APK

```bash
# Create keystore (do this once)
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release-key

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore release.keystore \
  android/app/build/outputs/apk/release/app-release.apk \
  release-key

# Verify signature
jarsigner -verify -verbose -certs \
  android/app/build/outputs/apk/release/app-release.apk
```

---

## Configuration

### Backend API URL

1. Open the app on device/emulator
2. Go to Settings tab
3. Enter your backend API URL (e.g., `http://192.168.1.100:8002/api` for local testing)
4. Tap Save

**For Local Testing:**
```
http://YOUR_MACHINE_IP:8002/api
```

Get your machine IP:
- macOS/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig | findstr /R "IPv4"`

### Permissions

All permissions are auto-requested on first launch. User can change them in:
- Android Settings → Apps → RoadGuard → Permissions

**Required Permissions:**
- GPS: Fine Location
- Camera: Camera access
- Storage: Read/Write files

---

## Development Workflow

### Making Changes

1. **Frontend Code**: Changes auto-reload (fast refresh) within 2-3 seconds
   - Edit `.js` files in `src/`
   - Changes appear on device automatically

2. **Native Code**: Requires rebuild
   - Changes to `android/` files require: `npm run android`
   - Changes to native modules require: `npm run android -- --no-packager`

3. **Adding Dependencies**:
   ```bash
   npm install package-name
   npm run android  # Rebuild for native modules
   ```

### Debugging

#### React Native Debugger

```bash
# Start app in debug mode
npm run android

# In app, shake device or press Menu (D on emulator)
# Select "Debug"
# Opens http://localhost:8081/debugger-ui
```

#### Android Studio Debugger

1. Open Android Studio → Tools → Device Manager
2. Start your device
3. Open the project in Android Studio
4. Run with debugger (Shift+F9)

#### Logcat Output

```bash
# View device logs
adb logcat

# Filter by app tag
adb logcat com.roadguard.mobile:* *:S

# Real-time monitoring
adb logcat --follow
```

### Common Development Commands

```bash
# Clear Metro cache
npm start -- --reset-cache

# Clean Android build
cd android && ./gradlew clean && cd ..

# Force full rebuild
npm run android -- --no-packager

# View device list
adb devices

# Install app without running
cd android && ./gradlew installDebug && cd ..
```

---

## Troubleshooting

### Issue: "Environment variable ANDROID_HOME is not set"

**Solution:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk

# Source the file
source ~/.zshrc
```

### Issue: Gradle sync failed

**Solution:**
```bash
cd android
./gradlew --stop
./gradlew clean
./gradlew sync
cd ..
npm run android
```

### Issue: Metro bundler crashes

**Solution:**
```bash
# Kill all node processes
killall node

# Clear cache and restart
npm start -- --reset-cache
```

### Issue: App crashes on startup

**Check:**
1. Are permissions granted? (Check device settings)
2. Is database initializing? (Check logcat for errors)
3. Is device connected? (Run `adb devices`)

**Debug:**
```bash
# Clear device logs
adb logcat -c

# Run app and view logs
npm run android
adb logcat com.roadguard.mobile:V
```

### Issue: "connection refused" sync errors

**Solution:**
1. Verify backend running: `curl http://YOUR_IP:8002/api/health`
2. Update API URL in Settings tab
3. Ensure device has network access: `adb shell ping 8.8.8.8`

### Issue: GPS not working

**Solution:**
1. Enable location in device settings
2. Grant fine location permission to app
3. Wait 30 seconds for GPS to acquire satellites
4. For emulator: Open Extended controls → Location → Set coordinates

### Issue: Camera not working

**Solution:**
1. Grant camera permission in app settings
2. For emulator: Ensure camera permission is granted in AVD settings
3. Restart the app

---

## Testing Offline Functionality

### Manual Testing

1. **Capture Reports**:
   - Go to Report tab
   - Take a photo and submit 2-3 reports
   - Verify they appear in History (Pending)

2. **Go Offline**:
   - Enable Airplane Mode
   - App shows orange "Offline" indicator
   - Submit more reports

3. **Go Online**:
   - Disable Airplane Mode
   - App shows green "Online" indicator
   - Wait 30 seconds for auto-sync
   - Check History → all reports should be Synced

### Automated Testing (CI/CD)

```bash
# Run unit tests
npm test

# Run linting
npm run lint

# Generate coverage
npm test -- --coverage
```

---

## Performance Monitoring

### Check APK Size

```bash
# Debug APK
ls -lh android/app/build/outputs/apk/debug/app-debug.apk

# Release APK
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

**Target:**
- Debug APK: ~50-80MB
- Release APK: ~30-50MB

### Memory Profiling

1. Connect device
2. npm start (keep running)
3. Open Android Studio → Device File Explorer
4. Navigate: data/data/com.roadguard.mobile/
5. Check database size in databases folder

---

## Deployment Checklist

Before deploying to production:

- [ ] Backend API URL is correct
- [ ] API is reachable from production network
- [ ] All permissions work correctly
- [ ] GPS and camera functional
- [ ] Sync logic tested offline/online
- [ ] Database schema migration tested
- [ ] Error handling covers edge cases
- [ ] No console errors/warnings
- [ ] APK size optimized
- [ ] Icon and app name correct
- [ ] Version number incremented

---

## Important Files Reference

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `android/build.gradle` | Root Gradle configuration |
| `android/app/build.gradle` | App-level Gradle configuration |
| `android/gradle.properties` | NDK and build properties |
| `android/settings.gradle` | Project structure |
| `android/app/src/main/AndroidManifest.xml` | Permissions and activities |
| `index.js` | React Native entry point |
| `App.js` | Main app component |
| `src/context/AppContext.js` | Global state management |
| `src/services/database.js` | SQLite operations |
| `src/services/syncService.js` | Sync logic |

---

## Useful Links

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Android Dev Docs](https://developer.android.com/docs)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [RoadGuard Backend API](http://localhost:8002/docs)

---

## Getting Help

1. **Check Logs**: `adb logcat | grep RoadGuard`
2. **Rebuild**: `npm run android -- -clean`
3. **Ask Developer**: Provide logcat output and steps to reproduce
4. **Issue Tracker**: [GitHub Issues Link]

---

**Last Updated**: 2024
**Status**: Production Ready
