# Wake Up Challenge App - Codebase Structure

## Purpose

This document describes the intended codebase structure for the Expo app.

It is based on the initial `alarm-app/src/` structure proposal, adjusted to match the current MVP scope and technical docs.

## Current Repo Root

The app repository root is `sleepy-face/`.

Important root files and folders:

```text
sleepy-face/
├── src/
├── assets/
├── docs/
├── app.json
├── package.json
└── tsconfig.json
```

## Proposed App Structure

```text
src/
├── app/
├── services/
├── lib/
├── utils/
└── modules/
```

Static app assets stay in the existing root-level `assets/` folder unless the team decides to move assets under `src/`.

Native Android project files should exist only after the app is prebuilt or a custom native module requires them.

## `src/app/`

`src/app/` contains screens and routing managed by Expo Router.

Proposed files:

```text
src/app/
├── _layout.tsx
├── index.tsx
├── login.tsx
├── profile-setup.tsx
├── home.tsx
├── add-friend.tsx
├── alarms.tsx
├── add-alarm.tsx
├── edit-alarm.tsx
├── ringing.tsx
├── face-check.tsx
├── face-check-success.tsx
├── face-check-failure.tsx
├── quiz.tsx
├── quiz-success.tsx
├── quiz-failure.tsx
└── offline.tsx
```

Screen responsibilities:

| file | responsibility |
| --- | --- |
| `_layout.tsx` | Configure Expo Router layout, route stack, and authenticated navigation state. |
| `index.tsx` | Initial entry screen. Decide whether to show login, Initial Setup, Home, or Offline Page. |
| `login.tsx` | Google Login screen using Supabase Auth. |
| `profile-setup.tsx` | First-time profile setup for public User ID and Display Name. |
| `home.tsx` | Main app entry after Initial Setup. Alarm is the default Home area. |
| `add-friend.tsx` | Search by public User ID or Display Name, list existing Friends, and add a mutual Friend. |
| `alarms.tsx` | List Saved Alarms, show time/repeat/ON-OFF state, toggle local ON/OFF state, and navigate to create/edit flows. |
| `add-alarm.tsx` | Create a new Saved Alarm with time and selected weekdays. |
| `edit-alarm.tsx` | Edit or delete an existing Saved Alarm. |
| `ringing.tsx` | Show the active ringing alarm and start the Wake Up Challenge. |
| `face-check.tsx` | Capture a selfie, save the latest captured photo locally, and upload it as a simple failure photo record. Face Verification logic is still a later slice. |
| `face-check-success.tsx` | Show Face Verification success and proceed to Quiz. |
| `face-check-failure.tsx` | Show Face Verification failure and return to retake flow. |
| `quiz.tsx` | Ask arithmetic Quiz Questions and track correct answers and timer state. |
| `quiz-success.tsx` | Show Challenge Success after Quiz Completion. |
| `quiz-failure.tsx` | Show Quiz Failure and trigger Failure Card creation when applicable. |
| `offline.tsx` | Universal Offline Page that blocks app usage while offline. |

## `src/services/`

`src/services/` contains app-facing operations that interact with persistence, Supabase, native modules, or platform APIs.

This folder is optional for tiny features, but it should be used when screen files would otherwise contain backend or platform details directly.

Proposed files:

```text
src/services/
├── alarm.ts
├── auth.ts
├── user.ts
├── friend.ts
├── quiz.ts
└── wakeChallenge.ts
```

Service responsibilities:

| file | responsibility |
| --- | --- |
| `alarm.ts` | Saved Alarm create/list/update/delete, ON/OFF toggle persistence, next alarm calculation, local scheduling, and native alarm module calls. |
| `auth.ts` | Supabase OAuth-only Google Login, browser auth-session lifecycle, Auth User ID lookup, and auth-state subscription. |
| `user.ts` | Initial Setup Profile lookup and Profile creation with public User ID and Display Name. |
| `friend.ts` | Profile search, add Friend, and list Friends. |
| `quiz.ts` | Service-only Quiz Question generation, answer checking, Quiz Progress and Quiz Attempt Number tracking, and current-schema quiz-failure photo recording. |
| `wakeChallenge.ts` | Captured-photo local persistence, latest local photo lookup, Supabase Storage upload, and simple `photos` record creation. Daily Alarm Attempt and final Failure Card creation are later slices. |

## `src/lib/`

`src/lib/` contains shared setup for external services and app-wide clients.

Proposed files:

```text
src/lib/
└── supabase.ts
```

Responsibilities:

| file | responsibility |
| --- | --- |
| `supabase.ts` | Create and export the Supabase client used by services, including secure mobile auth storage. |

## `src/utils/`

`src/utils/` contains small pure utilities that do not depend on Supabase, native modules, or screen state.

Proposed files:

```text
src/utils/
└── quiz.ts
```

Responsibilities:

| file | responsibility |
| --- | --- |
| `quiz.ts` | Generate two-digit addition and subtraction Quiz Questions. |

## `src/modules/`

`src/modules/` is reserved for custom Expo Native Modules.

Proposed module:

```text
src/modules/
└── expo-alarm/
    ├── android/
    │   └── src/
    ├── src/
    ├── expo-module.config.json
    └── package.json
```

Responsibilities:

| path | responsibility |
| --- | --- |
| `expo-alarm/` | Custom native alarm capability if Expo libraries are not enough for MVP alarm behavior. |
| `expo-alarm/android/src/` | Android native implementation, likely Kotlin, for alarm behavior. |
| `expo-alarm/src/` | TypeScript wrapper used by the app. |
| `expo-module.config.json` | Expo Module configuration. |
| `package.json` | Module package metadata. |

## `assets/`

The existing `assets/` folder stores static files used by the app.

Proposed structure:

```text
assets/
├── images/
│   ├── logo.png
│   └── default-avatar.png
└── sounds/
    └── alarm.mp3
```

Responsibilities:

| path | responsibility |
| --- | --- |
| `assets/images/` | Logos, default images, app icons, and other image files. |
| `assets/sounds/` | Alarm sounds and other local audio files. |

## Root Native And Config Files

Proposed root-level files:

```text
android/
.env
.gitignore
app.json
package.json
tsconfig.json
```

Responsibilities:

| path | responsibility |
| --- | --- |
| `android/` | Android native project generated by prebuild or required for custom native alarm work. |
| `.env` | Local environment variables such as Supabase URL and anon key. Do not commit secrets. |
| `.gitignore` | Files ignored by Git. |
| `app.json` | Expo app configuration. |
| `package.json` | Dependencies and npm scripts. |
| `tsconfig.json` | TypeScript configuration. |

## Differences From The Initial Sketch

The initial sketch included several items that do not match the current MVP scope. Use the adjusted structure above instead.

| initial sketch item | current MVP direction |
| --- | --- |
| `signin.tsx` and `signup.tsx` for email auth | Use `login.tsx` for Google Login through Supabase Auth. Email/password auth is out of scope. |
| Alarm ON/OFF behavior | Implemented for Saved Alarms as local `isEnabled` state. |
| Logout in `auth.ts` | Out of scope for MVP docs. Add only if the product scope changes. |
| Home showing "sleeping face" wording | Use Friends Feed and Failure Card terminology. |
| Generic photo publishing | Current camera flow uploads simple captured-photo records. Final Failure Card publishing remains tied to Quiz Failure in a later backend slice. |
