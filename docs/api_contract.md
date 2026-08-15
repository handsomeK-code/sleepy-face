# Wake Up Challenge App - API Contract

## Purpose

This document defines the frontend/backend contract for the MVP.

This is not a REST API design. In this project, API means the frontend contract for Supabase Auth, Postgres tables/views, Storage, and RPC functions.

## Overall Rules

- The frontend must be authenticated before reading or writing app data, except during login.
- The frontend performs camera capture, face detection, quiz generation, quiz checking, alarm timers, and local alarm scheduling on device.
- Supabase records durable profile, friendship, Daily Alarm Attempt, Friends Feed Access, and Failure Card state.
- Saved Alarms stay in local device storage.
- Manual Failure Card creation is not allowed.
- Failure Cards can only be created through the challenge failure RPC.
- Failure Cards are not deletable or hideable in the MVP.

## Standard Supabase Response Shape

Supabase SDK calls return:

```ts
{
  data: T | null;
  error: SupabaseError | null;
}
```

RPC calls use the same outer response shape. The custom app-level payload is inside `data`.

Successful RPC payload:

```ts
{
  status: "ok";
  data?: unknown;
}
```

App-level RPC failure payload:

```ts
{
  status: "error";
  error: string;
  code?: string;
}
```

Frontend handling rule:

- If `error` is non-null, handle it as a Supabase SDK, network, permission, or database failure.
- If `error` is null and `data.status` is `"error"`, handle it as an app-rule failure.
- If `error` is null and `data.status` is `"ok"`, use `data.data`.

Recommended error codes:

- `not_authenticated`
- `profile_not_found`
- `user_id_already_taken`
- `profile_already_created`
- `daily_attempt_already_exists`
- `invalid_attempt_state`
- `photo_required`
- `feed_access_blocked`
- `friend_not_found`
- `friendship_already_exists`
- `cannot_friend_self`
- `storage_object_not_found`
- `permission_denied`

## Auth API

### Google Login

Supabase feature:

- Auth OAuth

Frontend use:

- Sign in with Google.

Frontend call:

```ts
supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: string
  }
});
```

Rules:

- Google Login is the only supported MVP login method.
- Supabase Auth provider configuration and Expo redirect URL configuration are required.
- Supabase Auth's internal `user.id` is separate from the public User ID.

### Get Current Session

Supabase feature:

- Auth session

Frontend use:

- Restore logged-in state on app launch.

Frontend call:

```ts
supabase.auth.getSession();
```

Frontend behavior:

- If no session exists, show Google Login.
- If a session exists but no profile exists, show Initial Setup.
- If a session and profile exist, show Home.

## Profile API

### Create Profile

Supabase feature:

- RPC

Frontend use:

- Complete Initial Setup.

RPC:

```ts
supabase.rpc("create_profile", {
  user_id: string,
  display_name: string
});
```

Successful data payload:

```ts
{
  profile_id: string;
  user_id: string;
  display_name: string;
  created_at: string;
}
```

Rules:

- One profile per authenticated user.
- `user_id` is required and unique.
- `user_id` cannot be changed after creation in the MVP.
- `display_name` is required.
- `display_name` cannot be changed after creation in the MVP.

### Get My Profile

Supabase feature:

- Postgres table or view select

Frontend call:

```ts
supabase
  .from("profiles")
  .select("id, user_id, display_name, created_at")
  .eq("id", user.id)
  .single();
```

Data:

```ts
{
  id: string;
  user_id: string;
  display_name: string;
  created_at: string;
}
```

## Local Alarm API

Saved Alarms are frontend-local state, backed by local device storage.

Required operations:

- Create Saved Alarm
- List Saved Alarms
- Update Saved Alarm
- Delete Saved Alarm
- Get next scheduled alarm
- Persist active Daily Alarm Attempt state while the challenge is running

Local Saved Alarm shape:

```ts
{
  id: string;
  time: string;
  weekdays: number[];
  created_at: string;
  updated_at: string;
}
```

Rules:

- `time` uses 24-hour `HH:mm` format.
- `weekdays` uses `0` for Sunday through `6` for Saturday.
- A Saved Alarm must include at least one weekday.
- Two Saved Alarms cannot include the same weekday.
- Saved Alarms cannot be edited or deleted while they are the active Daily Alarm Attempt.
- No alarm enable/disable state exists in the MVP.

## Daily Attempt API

### Start Daily Attempt

Supabase feature:

- RPC

Frontend use:

- Register that an online scheduled alarm has started.

RPC:

```ts
supabase.rpc("start_daily_attempt", {
  local_date: string,
  timezone: string,
  scheduled_for_local: string,
  saved_alarm_local_id: string
});
```

Successful data payload:

```ts
{
  attempt_id: string;
  state: "active";
}
```

Rules:

- Do not call this if the app is offline at the scheduled alarm time.
- One Daily Alarm Attempt per user per local date.
- If an attempt already exists for the local date, return `daily_attempt_already_exists`.
- This RPC does not create a Failure Card.

### Get Today Attempt State

Supabase feature:

- Postgres table or view select

Frontend call:

```ts
supabase
  .from("daily_attempts")
  .select("id, local_date, state, result, feed_access_until, created_at, completed_at")
  .eq("local_date", localDate)
  .maybeSingle();
```

Data:

```ts
{
  id: string;
  local_date: string;
  state: "active" | "completed";
  result: "success" | "quiz_failure" | "timeout_failure" | "bad_photo_failure" | "active_offline_failure" | "abandoned_failure" | null;
  feed_access_until: string | null;
  created_at: string;
  completed_at: string | null;
}
```

## Challenge Result API

### Complete Challenge Successfully

Supabase feature:

- RPC

RPC:

```ts
supabase.rpc("complete_challenge_success", {
  attempt_id: string,
  local_date: string,
  face_verified: boolean,
  correct_quiz_count: number
});
```

Rules:

- `face_verified` must be `true`.
- `correct_quiz_count` must be `3`.
- No Failure Card is created.
- Friends Feed Access is allowed for the current local day.

### Record Challenge Failure

Supabase feature:

- RPC

RPC:

```ts
supabase.rpc("record_challenge_failure", {
  attempt_id: string,
  local_date: string,
  failure_type: ChallengeFailureType,
  face_verified: boolean,
  photo_path: string | null
});
```

Failure types:

```ts
type ChallengeFailureType =
  | "quiz_failure"
  | "timeout_failure"
  | "bad_photo_failure"
  | "active_offline_failure"
  | "abandoned_failure";
```

Successful data payload:

```ts
{
  attempt_id: string;
  result: string;
  failure_card_id: string | null;
  friends_feed_access: "allowed" | "blocked";
  feed_access_blocked_until: string | null;
}
```

Rules:

- `quiz_failure` requires `photo_path`.
- `quiz_failure` creates one non-removable Failure Card.
- `quiz_failure` allows immediate Friends Feed Access.
- Non-quiz failures do not create Failure Cards.
- Non-quiz failures block Friends Feed Access for the rest of the user's current local day.
- The RPC must reject duplicate completion for the same attempt.

## Failure Photo Storage API

Storage bucket:

```text
failure-photos
```

Object path:

```text
{auth_user_id}/{attempt_id}.jpg
```

Upload call:

```ts
supabase.storage
  .from("failure-photos")
  .upload(path, fileBody, {
    contentType: "image/jpeg",
    upsert: false
  });
```

Signed URL call:

```ts
supabase.storage
  .from("failure-photos")
  .createSignedUrl(path, expiresInSeconds);
```

Rules:

- Upload only after face detection has passed and the app can fail with a valid Quiz Failure photo.
- The frontend passes the returned path into `record_challenge_failure`.
- Storage policies must prevent users from overwriting other users' photos.
- Photo display should use signed URLs or a controlled read policy.
- The frontend should request URLs only for paths returned by `friends_failure_feed` or `my_failure_cards`.

## Friend API

### Search Profiles

Supabase feature:

- RPC or Postgres view select

RPC:

```ts
supabase.rpc("search_profiles", {
  query: string
});
```

Result item:

```ts
{
  profile_id: string;
  user_id: string;
  display_name: string;
  is_friend: boolean;
}
```

Rules:

- Search uses public User ID or Display Name.
- The current user's own profile should not appear in results.
- Search must not expose email, provider identity, or private account metadata.

### Add Friend

Supabase feature:

- RPC

RPC:

```ts
supabase.rpc("add_friend", {
  friend_profile_id: string
});
```

Rules:

- Adding a friend creates a mutual friendship immediately.
- The RPC must reject attempts to add yourself.
- Duplicate friendship creation should be idempotent or return `friendship_already_exists`.

### List Friends

Supabase feature:

- Postgres view select

Frontend call:

```ts
supabase
  .from("my_friends")
  .select("friend_profile_id, user_id, display_name, created_at")
  .order("display_name", { ascending: true });
```

## Friends Feed API

### Check Friends Feed Access

Supabase feature:

- RPC or view

RPC:

```ts
supabase.rpc("get_friends_feed_access", {
  local_date: string
});
```

Data:

```ts
{
  access: "allowed" | "blocked";
  blocked_until: string | null;
  reason: string | null;
}
```

Rules:

- Quiz Failure grants access immediately.
- Challenge Success grants access for the current local day.
- Timeout, Bad Photo Failure, Active Offline Failure, and Abandoned Failure block access for the rest of the current local day.

### List Friends Failure Feed

Supabase feature:

- Postgres view select

Frontend call:

```ts
supabase
  .from("friends_failure_feed")
  .select("id, profile_id, user_id, display_name, photo_path, failed_on, created_at")
  .order("created_at", { ascending: false })
  .range(offset, offset + limit - 1);
```

Rules:

- Only users with current Friends Feed Access can read this view.
- Feed includes only friends' Failure Cards.
- Feed shows Failure Cards newest first.

## Profile Failure API

### List My Failure Cards

Supabase feature:

- Postgres table or view select

Frontend call:

```ts
supabase
  .from("my_failure_cards")
  .select("id, photo_path, failed_on, created_at")
  .order("created_at", { ascending: false });
```

Rules:

- Profile failure history remains available even when Friends Feed Access is blocked.
- Only Failure Cards with uploaded photos appear.

