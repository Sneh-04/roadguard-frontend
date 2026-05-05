# RoadGuard-AI - Quick Start Commands

## ✅ App is Now Working!

### Start Development Server
```bash
cd /Users/pawankumar/Desktop/RoadHazardProject/mobile
npx expo start
```

Then scan the QR code with **Expo Go** app on your phone.

---

## All Available Commands

```bash
# Start Expo (most common)
npm start

# Clear cache and start
npx expo start --clear

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Build APK for Android
npm run build:apk

# Run tests
npm test

# Install dependencies (if needed)
npm install --legacy-peer-deps

# Clean install everything
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

## Phone Setup

1. **Download Expo Go** from App Store or Play Store
2. **Connect** to same WiFi as computer
3. **Run** `npx expo start` in terminal
4. **Scan** QR code with Expo Go
5. **Wait** for app to load (1-2 minutes first time)
6. **Done!** ✅

---

## Configuration (Optional)

Edit `src/utils/constants.ts`:
- Update `BACKEND_URL` to your server
- Add `OPENWEATHER_API_KEY`

Edit `.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend.com
```

---

## Troubleshooting

**Port 8081 in use?**
```bash
lsof -ti:8081 | xargs kill -9
```

**Dependencies broken?**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```

**Still having issues?**
```bash
# Clear everything, including Expo cache
rm -rf node_modules package-lock.json .expo
npm install --legacy-peer-deps
npx expo start --clear
```

---

**App Status**: ✅ FULLY WORKING  
**Last Updated**: March 19, 2026
