# Wake Up Challenge App - Tech Stack

## Purpose

This document records the current and planned technical stack for the MVP.

It separates dependencies already installed in the app from dependencies required by the MVP but not yet installed.

Current behavior and platform limits are documented in [`current_implementation_spec.md`](./current_implementation_spec.md).

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
| `@react-native-async-storage/async-storage` | `2.2.0` | Device-local Saved Alarms, attempt/access day markers, active Wake Challenge record, and Dev Mode |
| `@supabase/supabase-js` | `^2.112.3` | Supabase Auth, Postgres reads/writes, RPC calls, Storage upload/public URL |
| `expo` | `~57.0.12` | Expo app runtime |
| `expo-audio` | `~57.0.4` | In-app preview of bundled custom Alarm Sounds |
| `expo-camera` | `^57.0.3` | Photo Capture during Wake Up Challenge |
| `react` | `19.2.3` | React runtime |
| `react-native` | `0.86.2` | Native app framework |
| `expo-router` | `~57.0.12` | File-based routing |
| `@expo/ui` | `~57.0.10` | Expo UI package |
| `expo-constants` | `~57.0.10` | App/runtime constants |
| `expo-dev-client` | `~57.0.12` | Native development build support for installed Expo modules |
| `expo-device` | `~57.0.1` | Device information |
| `expo-file-system` | `^57.0.4` | Local photo persistence before upload |
| `expo-font` | `~57.0.1` | Font loading |
| `expo-glass-effect` | `~57.0.1` | Expo glass effect UI support |
| `expo-image` | `~57.0.2` | Image rendering |
| `expo-image-picker` | `~57.0.12` | Custom Profile Icon selection and square crop |
| `expo-linking` | `~57.0.5` | Deep linking |
| `expo-notifications` | `~57.0.13` | Notification permission and Expo Push Token registration |
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
| Network status detection capability | Universal Offline Page and active-offline failure handling |

Exact package choices for network detection still need implementation validation against Expo 57 compatibility.

Android Alarm Mechanics use a local Expo native module in Kotlin for Android-only exact alarm scheduling, default alarm tone playback, full-screen notification launch, and test ringing controls. This requires a rebuilt native Android app and is not supported in Expo Go.

Android Face Proof uses a local Expo native module in Kotlin with Google ML Kit face detection for on-device face presence checks. This requires a rebuilt native Android app and is not supported in Expo Go.

The native Alarm and Face Proof capabilities are also unavailable on iOS and web. Their screens may render, but Alarm creation/scheduling and successful Face Proof require the Android module.

## Backend Platform

The MVP backend is Supabase:

- Supabase Auth for Google Login
- Supabase Postgres for current Profile, photo, and friend relation state
- Supabase Postgres for reactions, comments, and Push Tokens
- Supabase Storage for failure photos and custom Profile Icon photos
- Supabase Row Level Security for user data access
- Supabase RPC functions for shared business rules, starting with Profile creation
- A Deno Edge Function for optional Expo Push delivery after an externally configured `photos` INSERT Webhook

The current app uploads a captured photo only when the Quiz times out, then inserts a simple `photos` record. The Friends Feed reads Friend `photos` and joins Profile, reaction, and comment data on the client. `daily_attempts`, structured `failure_cards`, and server-enforced/account-scoped Friends Feed Access remain deferred backend work.

The frontend should use the Supabase client directly for simple Auth and reads. It should use RPC functions when the backend must enforce consistent rules.

Google Login uses Supabase OAuth-only for the MVP. The Expo app opens the Supabase OAuth URL with `expo-web-browser`, receives the `sleepyface://google-auth` custom-scheme redirect, and stores the resulting Supabase session through secure mobile storage. Native Google Sign-In, Nitro Google Sign-In, Credential Manager, One Tap, and `signInWithIdToken` are not used in the MVP.

## Local Device Storage

Saved Alarms, Wake Challenge Attempt state, and Friends Feed Access state stay local to the device.

Current `AsyncStorage` data includes:

- `sleepy-face:saved-alarms`: time, weekdays, ON/OFF, Alarm Sound, last-fired day, local ID, and timestamps
- `sleepy-face:last-alarm-attempt-local-day`: device-wide last Daily Alarm local day
- `sleepy-face:wake-challenge-attempt`: active Alarm ID, local day, and start time
- `sleepy-face:friends-feed-access-block`: blocked local day
- `sleepy-face:dev-mode`: development feature flag

These keys are device-wide and are not namespaced by authenticated Profile. Saved Alarms include an `isEnabled` field; older stored alarms without this field are read as enabled. The active Alarm Timer and Quiz session remain JavaScript in-memory state, while captured photos are copied to the app document directory.

Native ringing mechanics are implemented in the local `modules/alarm-ringing/` Expo Module. Enabled Saved Alarms are re-registered after Android boot through a Headless JS task.

Supabase should not store Saved Alarm schedules in the MVP unless the product scope changes.

## Current Scripts

From `package.json`:

| script | command |
| --- | --- |
| `start` | `expo start` |
| `android` | `expo run:android` |
| `ios` | `expo run:ios` |
| `web` | `expo start --web` |
| `lint` | `expo lint --max-warnings=0 -- --no-warn-ignored` |
| `lint:fix` | `expo lint --fix` |
| `test` | `vitest run` |
| `format` | `prettier --write .` |
| `format:check` | `prettier --check .` |
| `prepare` | `husky` |
| `reset-project` | `node ./scripts/reset-project.js` |

## Expo Version Rule

Before writing Expo-specific code, read the exact versioned Expo docs for SDK 57:

```text
https://docs.expo.dev/versions/v57.0.0/
```

This is required by the app repo instructions.
