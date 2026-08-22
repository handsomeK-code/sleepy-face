# Wake Up Challenge App - Codebase Structure

## Purpose

This document describes the current repository structure as of 2026-08-23. For the complete behavior implemented by these files, see [`current_implementation_spec.md`](./current_implementation_spec.md).

## Repository Root

The app repository root is `sleepy-face/`.

```text
sleepy-face/
├── assets/
├── docs/
├── modules/
├── plugins/
├── src/
├── supabase/
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
└── vitest.config.mts
```

| path | responsibility |
| --- | --- |
| `src/app/` | Expo Router screens and route-level orchestration |
| `src/components/` | Reusable UI, navigation, loading, and Wake Challenge components |
| `src/constants/` | Alarm sound and Profile Icon registries |
| `src/lib/` | Shared external-service clients |
| `src/services/` | Auth, persistence, Supabase, quiz, feed, and native-module boundaries |
| `modules/` | Local Expo Native Modules for Android alarm mechanics and face detection |
| `plugins/` | Expo config plugins |
| `supabase/` | Incremental SQL, migrations, and Edge Functions |
| `assets/` | App images, Profile Icons, and bundled alarm sounds |
| `docs/` | Product, technical, architecture, and implementation documentation |

There is no current `src/utils/` or `src/modules/` directory. Native modules live at the repository-level `modules/` path.

## `src/app/`

`src/app/` contains the current Expo Router routes.

```text
src/app/
├── _layout.tsx
├── index.tsx
├── signin.tsx
├── signup.tsx
├── google-auth.tsx
├── profile-setup.tsx
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
├── quiz-failure-photo.tsx
├── home.tsx
├── photo-detail.tsx
├── friends.tsx
├── add-friend.tsx
├── profile.tsx
├── dev-menu.tsx
├── alarm-ring-test.tsx
└── timer-test.tsx
```

Important route responsibilities:

| file | responsibility |
| --- | --- |
| `_layout.tsx` | Route stack, Auth/Profile gate, abandoned Wake Challenge detection, and Android boot-resync task registration |
| `signin.tsx` / `google-auth.tsx` | Google OAuth start and callback loading state |
| `profile-setup.tsx` | Initial Profile creation, preset icon selection, and custom Profile photo upload |
| `alarms.tsx` | Saved Alarm list, ON/OFF, next-occurrence status, and development alarm controls |
| `add-alarm.tsx` / `edit-alarm.tsx` | Alarm time, weekday, and sound configuration; edit also deletes |
| `ringing.tsx` | Native ringing-state lookup, Alarm Timer start, and Wake Challenge Attempt start |
| `face-check*.tsx` | Camera capture, local photo save, Android Face Proof, retry/failure count, and Quiz countdown |
| `quiz*.tsx` | Arithmetic Quiz, success/failure routing, failure-photo upload, and feed-access outcome |
| `home.tsx` | Friends Feed, local feed-access block, reactions, comments entry, and push-token registration |
| `photo-detail.tsx` | Photo detail, reaction toggle, and oldest-first comments |
| `friends.tsx` / `add-friend.tsx` | Friend list, public User ID search, and direct add |
| `profile.tsx` | Profile editing, custom icon photo, logout, own failure photos, and Dev Mode entry |
| `signup.tsx` | Placeholder only; no sign-up implementation |
| `dev-menu.tsx` / `alarm-ring-test.tsx` / `timer-test.tsx` | Development and manual verification surfaces |

There is no `offline.tsx`; universal offline handling is not implemented.

## `src/services/`

Current service groups:

| group | files | responsibility |
| --- | --- | --- |
| Auth/Profile | `auth.ts`, `user.ts`, `profile-icon-photo.ts`, `profile-photos.ts`, `push-token.ts` | Supabase Auth, Profile validation and updates, Profile images, own photos, Push Token registration |
| Alarm | `alarm.ts`, `android-alarm-mechanics.ts`, `alarm-sound-preview.ts`, `alarm-timer.ts` | Local Saved Alarms, native scheduling, sound previews, in-memory challenge timer |
| Wake Challenge | `wakeChallenge.ts`, `wake-challenge-attempt.ts`, `wake-challenge-rules.ts`, `face-proof.ts`, `quiz.ts`, `quiz-keypad.ts` | Local photo persistence, active attempt, failure rules, Android face detector boundary, Quiz state |
| Social | `friend.ts`, `home-feed.ts`, `friends-feed-access.ts`, `photo-reactions.ts`, `comments.ts` | Friend relations/search, Friends Feed reads, local access block, reactions, comments |
| Development | `dev-mode.ts` | Device-local Dev Mode flag |

Service tests live in `src/services/__tests__/` and use Vitest.

## `src/components/` and `src/constants/`

| path | responsibility |
| --- | --- |
| `components/bottom-nav.tsx` | Four-tab bottom navigation |
| `components/loading.tsx` | Loading states and buttons |
| `components/loading-skeletons.tsx` | Feed, Alarm, Friend, and Profile skeletons |
| `components/wake-challenge-ui.tsx` | Shared challenge controls, timer formatting, 180-second and three-attempt constants |
| `components/comment-bubble-icon.tsx` | Comment icon |
| `constants/alarm-sounds.ts` | Four Alarm Sound IDs and labels |
| `constants/profile-icons.ts` | Preset icon assets and custom-photo source resolution |

## Native Modules

### `modules/alarm-ringing/`

Local Expo Module named `AndroidAlarmMechanics`.

- Schedules exact saved/test alarms through `AlarmManager.setAlarmClock`.
- Uses a BroadcastReceiver and foreground service to ring outside the React Native process.
- Plays the selected bundled sound or a device ringtone fallback.
- Opens `/ringing` through a full-screen notification and deep link.
- Stops automatically after 180 seconds.
- Re-registers enabled alarms after Android boot through Headless JS.

### `modules/android-face-proof/`

Local Expo Module named `AndroidFaceProof`.

- Reads a local `file://` image.
- Runs Google ML Kit Face Detection in fast mode.
- Passes when at least one face is detected.
- Does not identify the user or perform liveness/biometric verification.

Both modules require a rebuilt Android development/production app and are unavailable in Expo Go, iOS, and web.

## `supabase/`

```text
supabase/
├── functions/
│   └── push-on-failure/
├── migrations/
│   └── 20260821073529_create_push_tokens.sql
├── sql/
│   ├── 2026-08-21_profile_icon_photos_bucket.sql
│   ├── 2026-08-22_comments.sql
│   └── 2026-08-22_photo_reactions.sql
└── README.md
```

- `migrations/` currently contains the `push_tokens` table and RLS policies.
- `sql/` contains manual SQL for Profile Icon Storage, comments, and reactions.
- `functions/push-on-failure/` contains the Deno Edge Function that sends Expo Push notifications after externally configured `photos` INSERT webhooks.
- The base schema for `profiles`, `photos`, `friends_relations`, `failure-photos`, and `create_profile` is not checked into this repository.

## Assets and Configuration

| path | responsibility |
| --- | --- |
| `assets/images/profile-icons/` | Eight attributed preset Profile Icons |
| `assets/sounds/` | Three previewable custom Alarm Sound WAV files |
| `modules/alarm-ringing/android/src/main/res/raw/` | Native copies of the custom Alarm Sounds |
| `app.json` | Expo app identity, `sleepyface` scheme, plugins, Android/iOS IDs, permissions |
| `plugins/with-android-alarm-mechanics.js` | Enables Android lock-screen display and screen wake for the main Activity |
| `google-services.json` | Android Google/Firebase service configuration |
| `eas.json` | EAS build configuration |

## Current Architectural Boundaries

- Saved Alarm schedules, Daily Alarm day markers, Wake Challenge Attempt state, Friends Feed Access, and Dev Mode are device-local and are not scoped by Auth User ID.
- Alarm Timer and Quiz session state are JavaScript in-memory state.
- Supabase stores Profiles, simple photo records, friend relations, social interactions, and Push Tokens.
- `photos` remains a simple record and is not a structured `failure_cards` model.
- Offline detection and a universal Offline Page remain unimplemented.
