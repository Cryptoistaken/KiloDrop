# CLAUDE.md — KiloDrop

## Project Overview

**KiloDrop** is a lightweight Android browser app built with React Native 0.79 (bare workflow,
no Expo). It is a full feature-port of Tool Browser (Kotlin/WebView) with a redesigned UI
inspired by Claude.ai. The compiled debug APK lives at
`android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Architecture

Single-screen app — no navigation library. All UI lives in one screen with modal bottom sheets.

```
KiloDrop/
├── index.js                  # Entry point — registers App component
├── App.js                    # Root — SafeAreaProvider + store init + renders BrowserScreen
├── src/
│   ├── theme.js              # Design tokens: colors, typography, spacing, shadows
│   ├── utils.js              # URL processing and display helpers
│   ├── store.js              # Zustand store: tabs, bookmarks, history, settings
│   ├── BrowserScreen.js      # Main screen: URL bar, WebView tabs, nav bar, all logic
│   ├── TabsSheet.js          # Modal bottom sheet: open tabs list + new tab
│   ├── BookmarksSheet.js     # Modal bottom sheet: bookmarks list
│   └── HistorySheet.js       # Modal bottom sheet: history grouped by day
└── .github/
    └── workflows/
        └── build.yml         # GitHub Actions: debug + signed release APK on push
```

**Key patterns:**
- `Zustand` for all state — tabs, bookmarks, history, settings
- `AsyncStorage` for persistence — bookmarks (`kd_bookmarks`) and history (`kd_history`)
- All WebView tabs mounted simultaneously, only active one visible via `display: 'flex'/'none'`
- Modal bottom sheets built with `Modal` + `Animated` + `PanResponder` — no third-party lib
- Cookie extraction via `WebView.injectJavaScript` → `onMessage` bridge

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | JavaScript (no TypeScript) |
| Framework | React Native 0.79 — bare workflow |
| React | 19.x |
| Architecture | New Architecture (Fabric + TurboModules) — enabled by default |
| State | Zustand 5.x |
| Persistence | @react-native-async-storage/async-storage 3.x |
| WebView | react-native-webview 13.x |
| Clipboard | @react-native-clipboard/clipboard |
| Haptics | react-native-haptic-feedback 3.x |
| Safe Area | react-native-safe-area-context 5.x |
| Screens | react-native-screens 4.x |
| Build | Gradle (Android only) |
| CI | GitHub Actions |
| Min SDK | API 24 (Android 7.0) |

---

## Design System

Claude.ai-inspired dark UI. All tokens live in `src/theme.js`.

**Colors:**
- Backgrounds: `#0a0a0b` (canvas) → `#111113` (surface) → `#1a1a1e` (elevated) → `#242428` (hover)
- Borders: `rgba(255,255,255,0.06)` / `0.10` / `0.18`
- Text: `#f5f5f5` (primary) / `#a0a0ab` (muted) / `#5a5a6a` (placeholder)
- Accent: `#da7756` (warm orange-bronze — Claude's signature color)
- Accent tint: `rgba(218,119,86,0.15)`

**Typography:** System font (Roboto on Android). Scale: 11 / 13 / 15 / 17 / 20px.

**Spacing:** Base 4px. Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48.

**Radius:** 6px (sm) / 10px (md) / 16px (lg) / 9999px (pill).

---

## Features

- Multi-tab browsing — up to 10 tabs, all mounted, only active one shown
- Bookmarks — persisted in AsyncStorage, toggle from menu
- Browsing history — persisted in AsyncStorage, max 500 entries, grouped by day
- Smart URL bar — raw URLs pass through, anything else becomes a Google search
- Progress bar — 2px accent-colored strip below URL bar
- Pull-to-refresh on WebView
- Desktop site toggle — swaps User-Agent string
- Share & Copy URL
- Copy Cookie — reads `document.cookie` via JS injection, copies to clipboard + haptic
- Basic ad block — blocks known ad domains in `onShouldStartLoadWithRequest`
- Clear browsing data — clears history + WebView cache
- Clear-on-launch strategy — if `clearOnExit` setting is on, clears at next app start

---

## Key Implementation Notes

### Tab Management
All tabs are rendered at all times. Active tab uses `display: 'flex'`, inactive tabs use
`display: 'none'`. WebView refs stored in `useRef` map keyed by tab ID. This preserves
back/forward history per tab without remounting.

### Cookie Extraction
Triggered on demand (menu → Copy Cookies). Uses `webViewRef.injectJavaScript()` to run
`document.cookie` and post via `window.ReactNativeWebView.postMessage`. Caught in `onMessage`.

### AsyncStorage Keys
- `kd_bookmarks` — JSON array of `{ url, title, addedAt }`
- `kd_history` — JSON array of `{ url, title, visitedAt }`
- `kd_settings` — JSON object with app settings

### Store Initialization
`App.js` runs `loadBookmarks()`, `loadHistory()`, and checks `clearOnExit` in a `useEffect`
on mount, before the browser screen renders.

### Ad Block List
Hardcoded in `BrowserScreen.js`. Same domain list as the original Tool Browser Kotlin app.
Checked against request URL host in `onShouldStartLoadWithRequest`.

### Bottom Sheets
Each sheet is a `Modal` with `animationType="slide"`. A `PanResponder` on the drag handle
lets the user swipe down to dismiss. Background overlay taps also dismiss.

---

## Build Commands

```bash
# Start Metro bundler
npm start

# Run on connected Android device / emulator
npm run android

# Build debug APK manually
cd android && ./gradlew assembleDebug

# Build release APK (unsigned)
cd android && ./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## CI — GitHub Actions

Push to `main` or `master` triggers `.github/workflows/build.yml`:
- Builds debug APK always
- Builds signed release APK if repository secrets are present

**Required secrets for signed release:**
- `KEYSTORE_BASE64` — base64-encoded `.jks` keystore
- `KEY_ALIAS`
- `KEY_PASSWORD`
- `STORE_PASSWORD`

Generate a keystore:
```bash
keytool -genkey -v -keystore kilodrop.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kilodrop
# Then encode:
# Linux/macOS: base64 kilodrop.jks | pbcopy
# Windows:     certutil -encode kilodrop.jks kilodrop.b64
```

---

## Code Style

- JavaScript only — no TypeScript
- Tabs for indentation
- Single quotes
- No semicolons (except where required)
- No comments in code
- No `console.log` outside `__DEV__` guard
- `const` by default, `let` only when reassignment needed
- Arrow functions everywhere
- Functional components only
- `StyleSheet.create()` for all styles — no inline style objects in JSX
- No class components, no Redux, no React Navigation
- Import from `react-native` root only — no deep imports

---

## Notes for Claude

- **Android only** — ignore all iOS references, `ios/` folder does not exist
- **No TypeScript** — all files are `.js`, `tsconfig.json` does not exist
- **No test files** — `__tests__/` does not exist, no jest config
- **No Prettier config** — `.prettierrc.js` does not exist; formatting follows `.eslintrc.js`
- **No Gemfile / CocoaPods** — iOS tooling removed entirely
- **New Architecture is ON by default** in RN 0.79 — do not add any flags to disable it
- **zustand@5** uses `import { create } from 'zustand'` — the default export was removed in v5
- **react-native-haptic-feedback@3** API: `ReactNativeHapticFeedback.trigger('impactLight')`
- **AsyncStorage@3** is the scoped package `@react-native-async-storage/async-storage` —
  never use the deprecated `@react-native-community/async-storage`
- **File budget: 10 source files** — do not create additional files; merge if needed
- The `src/theme.js` tokens must be the single source of truth for all colors and spacing —
  never hardcode a color or spacing value outside of `theme.js`
- WebView `onShouldStartLoadWithRequest` returns `true` to allow and `false` to block
- Metro config and babel config are standard — do not modify unless a dep requires it
