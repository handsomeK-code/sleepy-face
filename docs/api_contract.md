# Wake Up Challenge App - API Contract

## Purpose

This document defines the current frontend/backend contract for Supabase Auth, app tables, Storage, and RPC functions as of 2026-08-23.

The current contract covers Google Login/logout, Profile creation and update, custom Profile photos, simple failure-photo records, friend relations, Friends Feed reads, reactions, comments, Push Token registration, and the optional failure-notification Edge Function. Wake Challenge Attempt and Friends Feed Access are implemented locally on the device; final server-side Daily Attempt/Failure Card persistence remains deferred.

For screen behavior, platform limits, and current implementation gaps, see [`current_implementation_spec.md`](./current_implementation_spec.md).

## Overall Rules

- The frontend must be authenticated before reading or writing app data, except during Google Login.
- Supabase Auth owns authenticated accounts in `auth.users`.
- App profile data lives in `profiles`, keyed by the Auth User ID.
- The public User ID is `profiles.user_id`; it is not the Auth User ID.
- The current schema does not include `daily_attempts`, `failure_cards`, or Friends Feed Access persistence.

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

Recommended current error codes:

- `not_authenticated`
- `user_id_already_taken`
- `profile_already_created`
- `invalid_profile_input`
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
    redirectTo: "sleepyface://google-auth",
    skipBrowserRedirect: true,
    queryParams: {
      prompt: "select_account"
    }
  }
});
```

The app opens the returned OAuth URL with an Expo browser auth session, receives the `sleepyface://google-auth` callback, extracts `access_token` and `refresh_token` from the returned URL, then calls:

```ts
supabase.auth.setSession({
  access_token: string,
  refresh_token: string
});
```

Rules:

- Google Login is the only supported MVP login method.
- Supabase Auth provider configuration and Expo redirect URL configuration are required.
- Supabase Auth's internal `user.id` is the Auth User ID.
- The MVP uses Supabase OAuth-only for Google Login, not native Google Sign-In or `signInWithIdToken`.
- The callback redirect URL `sleepyface://google-auth` must be allow-listed in Supabase Auth.
- Google provider tokens are not stored by the frontend in the MVP.

### Sign Out

Frontend call:

```ts
supabase.auth.signOut();
```

Rules:

- Sign Out is available from the Settings screen.
- On success, the app replaces the current route with `/signin`.
- Device-local Saved Alarms, Wake Challenge day markers, Friends Feed Access state, cached challenge photos, and Dev Mode are not cleared or namespaced by Auth User ID.

### Get Current Auth User

Supabase feature:

- Auth user

Frontend use:

- Restore authenticated user state on app launch.

Frontend call:

```ts
supabase.auth.getUser();
```

Frontend behavior:

- If no Auth User ID exists, show Google Login.
- If an Auth User ID exists but no Profile exists, show Initial Setup.
- If an Auth User ID and Profile exist, show Home.

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
  display_name: string,
  icon_id: string
});
```

Successful data payload:

```ts
{
  profile_id: string;
  user_id: string;
  display_name: string;
  icon_url: string;
  created_at: string;
}
```

Rules:

- One Profile per authenticated user.
- `profile_id` is the Auth User ID.
- `user_id` is the public User ID and must be unique.
- `display_name` is required.
- `icon_id` passed to the RPC must be one of the 8 known preset icon identifiers (`human`, `man`, `man2`, `woman`, `boy`, `child`, `old-man`, `grandmother`).
- If Initial Setup selected a custom photo URL, the client creates the row with a preset fallback and then updates `profiles.icon_url` through the Profile Update path.
- Public User ID cannot be edited. Display Name and Profile Icon can be edited from Settings.

### Get My Profile

Supabase feature:

- Postgres table select

Frontend call:

```ts
supabase
  .from("profiles")
  .select("id, user_id, display_name, icon_url, created_at")
  .eq("id", user.id)
  .maybeSingle();
```

Data:

```ts
{
  id: string;
  user_id: string;
  display_name: string;
  icon_url: string;
  created_at: string;
}
```

`icon_url` contains either a preset identifier or a full custom-photo URL.

### Update My Profile

Supabase feature:

- Postgres table update

Frontend call shape:

```ts
supabase
  .from("profiles")
  .update({
    display_name: string,
    icon_url: string
  })
  .eq("id", user.id)
  .select("id, user_id, display_name, icon_url, created_at")
  .single();
```

Rules:

- The client trims Display Name, requires a non-empty value, and limits it to 30 Unicode characters.
- `icon_url` can be a known preset ID or a custom Storage public URL.
- Public User ID is not part of the update payload.
- The deployed `profiles` RLS must permit an authenticated user to update their own row. That base policy SQL is not checked into this repository.

### Upload Custom Profile Icon

Supabase feature:

- Storage upload/upsert and public URL lookup

Current frontend service:

```ts
uploadProfileIconPhoto(localPhotoUri: string, contentType?: string);
```

Rules:

- Requires an authenticated user and photo-library permission at the picker layer.
- The image picker uses square editing and quality 0.8.
- Upload path is `{Auth User ID}/icon.{extension derived from content type}` in `profile-icon-photos`.
- Upload uses `upsert: true` and returns a public URL with a timestamp query parameter for cache busting.
- The caller writes the returned URL to `profiles.icon_url`; uploading by itself does not update the Profile row.

## Photo API

### Quiz Question Service

Frontend service:

```ts
startQuiz();
getQuizState();
submitQuizAnswer(answerText: string);
recordQuizFailurePhoto(localPhotoUri: string);
```

Rules:

- The service is client-side and owns one active Quiz session at a time.
- Quiz Questions are two-digit addition or subtraction problems.
- Public Quiz Questions include an ID and prompt, but do not expose the answer.
- Quiz Progress counts correct answers only.
- Quiz Attempt Number advances after every submitted answer, whether correct or wrong.
- `submitQuizAnswer` accepts string input, trims whitespace, and treats non-integer text as an incorrect answer.
- Quiz Completion happens after three correct answers.
- Wrong answers produce a replacement Quiz Question with a different prompt and do not cause immediate Quiz Failure.
- Submitting before Quiz start or after Quiz Completion throws a typed quiz service error.
- The service does not own Alarm Timer expiration or Challenge Success/Challenge Failure navigation.
- `recordQuizFailurePhoto` uses the current Photo API path and returns a current-schema quiz-failure photo record, not a final Failure Card row.

### Upload Failure Photo

Supabase features:

- Storage upload
- Public Storage URL lookup
- Postgres table insert

Frontend behavior:

1. Copy the captured camera photo into app local storage.
2. Upload the local file to the `failure-photos` Storage bucket under a current-user path.
3. Read the public URL for the uploaded object.
4. Insert a simple `photos` row for the current user.

Current frontend service:

```ts
uploadFailurePhoto(localPhotoUri: string);
```

Rules:

- The caller must be authenticated.
- The uploaded Storage path is scoped under the Auth User ID.
- The `photos.image_url` value is the public URL returned for the Storage object.
- The service returns the inserted `photos` row mapped as photo-record data.
- This is the current simple photo record flow, not the final Failure Card persistence model.

### List My Photos

Supabase feature:

- Postgres table select

Frontend call:

```ts
supabase
  .from("photos")
  .select("id, profile_id, image_url, created_at")
  .eq("profile_id", user.id)
  .order("created_at", { ascending: false });
```

Rules:

- The client queries only the authenticated user's rows on the Profile screen.
- The deployed policy must allow that own-photo read.
- This table is a simple photo record table, not the final Failure Card model.

### Add My Photo

Supabase feature:

- Postgres table insert

Frontend call:

```ts
supabase.from("photos").insert({
  profile_id: user.id,
  image_url: string
});
```

Rules:

- The client inserts only the authenticated user's own photo records.
- The deployed policy must reject a different `profile_id`.

### List Friends Feed Photos

Frontend service:

```ts
listFriendsFeed();
```

Behavior:

1. Resolve all relation rows where the viewer is either side.
2. Derive the other Profile ID from each relation.
3. Read those Profiles' `photos`, newest first.
4. Read Profile display/icon data.
5. Read all reactions and comments for the returned photo IDs.
6. Return reaction counts, whether the viewer reacted, and comment counts.

Rules:

- The deployed `photos` SELECT policy must allow the Friend-photo read path; its base SQL is not checked into this repository.
- `photos` is a simple record table, so the service treats all Friend photos as feed-visible failure records.
- Friends Feed Access is checked by a device-local service before this API is called; it is not enforced by the backend.

## Friend Relation API

### Search Profiles

Supabase feature:

- Postgres table select

Frontend behavior:

- Search Profiles by public User ID.
- Exclude the current user's own Profile from results.
- Return public profile fields needed by the add-friend screen.

Current frontend service:

```ts
searchProfiles(query: string);
```

Rules:

- The normalized query must contain at least two characters.
- Public User ID search is case-insensitive and prefix-oriented.
- Results exclude the current Profile and are limited to 20.
- Display Name search is not implemented.
- Current client requirements assume authenticated users can read Profiles for Friend Search.

### List My Friend Relations

Supabase feature:

- Postgres table select

Frontend call:

```ts
supabase
  .from("friends_relations")
  .select("id, profile_id, friend_profile_id, created_at")
  .or(`profile_id.eq.${user.id},friend_profile_id.eq.${user.id}`);
```

Rules:

- The deployed policy must allow users to read friend relation rows where they are either side.

### Add Friend Relation

Supabase feature:

- Postgres table insert

Frontend call:

```ts
supabase.from("friends_relations").insert({
  profile_id: user.id,
  friend_profile_id: string
});
```

Rules:

- The deployed policy must allow users to insert relation rows only from their own Profile.
- The database rejects self-relations.
- The database rejects duplicate `(profile_id, friend_profile_id)` rows.

## Photo Reaction API

Frontend services:

```ts
addPhotoReaction(photoId: string);
removePhotoReaction(photoId: string);
```

Rules:

- 😂 is the only supported reaction type; no emoji value is stored.
- Add upserts `(photo_id, profile_id)` and ignores duplicates.
- Remove deletes only the authenticated Profile's row for the specified photo.
- The database unique constraint enforces one row per `(photo_id, profile_id)`.
- Repository SQL allows all authenticated users to read reaction rows and users to insert/delete only their own.

## Comment API

Frontend services:

```ts
listComments(photoId: string);
addComment(photoId: string, content: string);
```

Rules:

- Comments are returned oldest first with commenter Profile data.
- The client trims content and rejects an empty result. It does not enforce a maximum length.
- Insert sets `user_id` to the authenticated Profile and leaves `parent_comment_id` null.
- Replies, update, and delete are not implemented.
- Repository SQL allows all authenticated users to read comments and users to insert only their own.

## Push Token API

Frontend service:

```ts
registerPushToken();
```

Rules:

- If notification permission is undetermined, the client requests it. A prior grant or denial is otherwise respected.
- If permission is not granted, registration returns `skipped` without requesting a token.
- The Expo Push Token is upserted into `push_tokens` with `onConflict: "token"`.
- An existing installation token is reassigned to the currently authenticated Profile.
- Home treats registration as best-effort and does not surface registration failure to the user.

## Failure Notification Edge Function

`supabase/functions/push-on-failure` accepts an externally configured `photos` INSERT Webhook.

Rules:

- Requests must include the configured `x-webhook-secret`.
- The function resolves both sides of `friends_relations`, loads Friend Push Tokens with the Service Role, and sends one Expo Push message per token.
- Notification title is the failed Profile's Display Name; body is `failed their wake-up challenge 😴`.
- The checked-in code does not deploy the function or create the Database Webhook. Supabase secrets and deployment are external setup steps.
- The message has no photo ID/deep-link data payload.

## Deferred APIs

The following server APIs from the larger product model are deferred until their backend tables exist:

- Daily Alarm Attempt API
- Challenge Result API
- Failure Card API
- Account-scoped/server-enforced Friends Feed Access API. Current access state is device-local.
- Failure photo Storage policies tied to Failure Cards
