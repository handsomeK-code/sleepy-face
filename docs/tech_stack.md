# Wake Up Challenge App - Tech Stack

## Purpose

This document records the current and planned technical stack for the MVP.

It separates dependencies already installed in the app from dependencies required by the MVP but not yet installed.

## Current App

Current app type:

- Expo React Native app
- TypeScript
- Expo Router file-based routing
- Portrait orientation
- Static web output configured
- App scheme: `sleepyface`

## Currently Installed Runtime Dependencies

From `package.json`:

| dependency | version | purpose |
| --- | --- | --- |
| `@supabase/supabase-js` | `^2.112.3` | Supabase Auth, Postgres reads, RPC calls, Storage upload/signed URL |
| `expo` | `~57.0.12` | Expo app runtime |
| `react` | `19.2.3` | React runtime |
| `react-native` | `0.86.2` | Native app framework |
| `expo-router` | `~57.0.12` | File-based routing |
| `@expo/ui` | `~57.0.10` | Expo UI package |
| `expo-constants` | `~57.0.10` | App/runtime constants |
| `expo-device` | `~57.0.1` | Device information |
| `expo-font` | `~57.0.1` | Font loading |
| `expo-glass-effect` | `~57.0.1` | Expo glass effect UI support |
| `expo-image` | `~57.0.2` | Image rendering |
| `expo-linking` | `~57.0.5` | Deep linking |
| `expo-secure-store` | `~57.0.1` | Secure persisted Supabase Auth session storage |
| `expo-splash-screen` | `~57.0.6` | Splash screen |
| `expo-status-bar` | `~57.0.1` | Status bar |
| `expo-symbols` | `~57.0.2` | Symbol icons |
| `expo-system-ui` | `~57.0.2` | System UI configuration |
| `expo-web-browser` | `~57.0.2` | Web browser/OAuth support |
| `react-dom` | `19.2.3` | Web rendering |
| `react-native-gesture-handler` | `~2.32.0` | Gesture handling |
| `react-native-reanimated` | `4.5.1` | Animation support |
| `react-native-safe-area-context` | `~5.7.0` | Safe area handling |
| `react-native-screens` | `~4.26.0` | Native screen primitives |
| `react-native-url-polyfill` | `^4.0.0` | URL support required by Supabase in React Native |
| `react-native-web` | `~0.21.0` | Web support |
| `react-native-worklets` | `0.10.1` | Worklet runtime |

## Current Dev Dependencies

| dependency | version | purpose |
| --- | --- | --- |
| `typescript` | `~6.0.3` | TypeScript compiler |
| `@types/react` | `~19.2.2` | React TypeScript types |
| `vitest` | `^4.1.10` | Service-boundary tests |

## Required MVP Dependencies Not Yet Installed

These are required by the product/API docs but are not currently installed in `package.json`.

| dependency / capability | purpose |
| --- | --- |
| Camera library, likely `expo-camera` | Photo Capture during Wake Up Challenge |
| Face detection library, likely ML Kit through a React Native package | Face Verification on device |
| SQLite, likely `expo-sqlite` | Local Saved Alarm storage and active attempt state |
| Local notification/alarm scheduling capability | Ring scheduled alarms on device |
| Network status detection capability | Universal Offline Page and active-offline failure handling |

Exact package choices for camera, face detection, local alarm scheduling, and network detection still need implementation validation against Expo 57 compatibility.

## Backend Platform

The MVP backend is Supabase:

- Supabase Auth for Google Login
- Supabase Postgres for durable app state
- Supabase Row Level Security for user data access
- Supabase RPC functions for shared business rules
- Supabase Storage for Failure Card photos

The frontend should use the Supabase client directly for simple Auth, reads, Storage upload, and signed URL calls. It should use RPC functions when the backend must enforce consistent rules.

Google Login uses Supabase OAuth-only for the MVP. The Expo app opens the Supabase OAuth URL with `expo-web-browser`, receives the `sleepyface://google-auth` custom-scheme redirect, and stores the resulting Supabase session through secure mobile storage. Native Google Sign-In, Nitro Google Sign-In, Credential Manager, One Tap, and `signInWithIdToken` are not used in the MVP.

## Local Device Storage

Saved Alarms stay local to the device.

Local storage should hold:

- Saved Alarm time
- Selected weekdays
- Local saved alarm ID
- Active Daily Alarm Attempt state while the challenge is running

Supabase should not store Saved Alarm schedules in the MVP unless the product scope changes.

## Current Scripts

From `package.json`:

| script | command |
| --- | --- |
| `start` | `expo start` |
| `android` | `expo start --android` |
| `ios` | `expo start --ios` |
| `web` | `expo start --web` |
| `lint` | `expo lint` |
| `reset-project` | `node ./scripts/reset-project.js` |

## Expo Version Rule

Before writing Expo-specific code, read the exact versioned Expo docs for SDK 57:

```text
https://docs.expo.dev/versions/v57.0.0/
```

This is required by the app repo instructions.
