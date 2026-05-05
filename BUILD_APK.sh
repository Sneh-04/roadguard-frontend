#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════╗
# ║         RoadGuard-AI — APK Build Script                  ║
# ║  Builds a release APK using EAS CLI (Expo)               ║
# ╚══════════════════════════════════════════════════════════╝
set -e

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[INFO]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()  { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }

echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║   RoadGuard-AI  ·  APK Build Script      ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── 0. Prerequisites ─────────────────────────────────────────
log "Checking prerequisites..."
command -v node >/dev/null || err "Node.js not found. Install from https://nodejs.org"
command -v npm  >/dev/null || err "npm not found."
NODE_VER=$(node -e 'process.stdout.write(process.version.slice(1))')
REQUIRED="18.0.0"
if [[ "$(printf '%s\n' "$REQUIRED" "$NODE_VER" | sort -V | head -1)" != "$REQUIRED" ]]; then
  err "Node.js $NODE_VER found but $REQUIRED+ is required."
fi
ok "Node.js $NODE_VER"

# ── 1. Install EAS CLI globally ──────────────────────────────
if ! command -v eas >/dev/null 2>&1; then
  log "Installing EAS CLI..."
  npm install -g eas-cli
fi
ok "EAS CLI $(eas --version)"

# ── 2. Install Expo CLI globally ────────────────────────────
if ! command -v expo >/dev/null 2>&1; then
  log "Installing Expo CLI..."
  npm install -g expo-cli
fi

# ── 3. Install dependencies ───────────────────────────────────
log "Installing npm dependencies..."
npm install
ok "Dependencies installed"

# ── 4. Check .env ─────────────────────────────────────────────
if [ ! -f ".env" ]; then
  warn ".env file not found. Creating default .env..."
  cat > .env << 'ENVEOF'
EXPO_PUBLIC_BACKEND_URL=https://roadguard-ai-3.onrender.com
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key_here
ENVEOF
fi
ok ".env file ready"

# ── 5. Expo login ─────────────────────────────────────────────
echo ""
echo -e "${YELLOW}You need an Expo account to build. Sign up free at https://expo.dev${RESET}"
echo -e "${YELLOW}If not logged in, the next step will prompt for credentials.${RESET}"
echo ""
eas whoami 2>/dev/null || eas login

# ── 6. Configure EAS project ─────────────────────────────────
log "Configuring EAS project..."
# Use the existing project ID in eas.json (590c9a06-9e34-4b4f-9a63-2e5aa1a16399)
# or run 'eas init' to create a new one
if ! grep -q "projectId" eas.json 2>/dev/null; then
  eas init --id 590c9a06-9e34-4b4f-9a63-2e5aa1a16399 --non-interactive || \
  eas init --non-interactive
fi

# ── 7. Build APK ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}Choose build type:${RESET}"
echo "  1) Cloud build via EAS (recommended, no Android SDK needed)"
echo "  2) Local build (requires Android SDK + NDK)"
echo ""
read -p "Enter choice [1]: " CHOICE
CHOICE="${CHOICE:-1}"

if [[ "$CHOICE" == "1" ]]; then
  log "Starting cloud APK build (profile: preview)..."
  log "This will take 5–15 minutes. Monitor at https://expo.dev/accounts/"
  eas build --platform android --profile preview --non-interactive
  echo ""
  ok "Build submitted! Download the APK from https://expo.dev/accounts/"

elif [[ "$CHOICE" == "2" ]]; then
  # ── Local build path ─────────────────────────────────────────
  command -v java >/dev/null || err "Java not found. Install JDK 17+."
  [ -n "$ANDROID_HOME" ] || err "ANDROID_HOME not set. Install Android SDK."

  log "Running expo prebuild to generate Android project..."
  npx expo prebuild --platform android --clean

  log "Building release APK with Gradle..."
  cd android
  ./gradlew assembleRelease 2>&1 | tee ../build_output.log
  cd ..

  APK_PATH=$(find android -name "*.apk" | grep -v debug | head -1)
  if [ -n "$APK_PATH" ]; then
    cp "$APK_PATH" "RoadGuard-AI-release.apk"
    ok "APK built: RoadGuard-AI-release.apk"
  else
    err "APK not found after build. Check build_output.log"
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  Build complete!                          ${RESET}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${RESET}"
