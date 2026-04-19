# KiloDrop

A lightweight Android browser built with React Native 0.79.

## Setup

```bash
npm install
npm run android
```

## Build APK

```bash
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Signed Release

Add these secrets to your GitHub repository:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | `base64 kilodrop.jks` |
| `KEY_ALIAS` | key alias |
| `KEY_PASSWORD` | key password |
| `STORE_PASSWORD` | store password |

Generate a keystore:
```bash
keytool -genkey -v -keystore kilodrop.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kilodrop
```

Push to `main` — GitHub Actions builds both debug and signed release APKs automatically.
