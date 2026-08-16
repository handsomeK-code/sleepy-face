# Wake Up Challenge App - API Contract

## Purpose

This document defines the current frontend/backend contract for Supabase Auth, app tables, and RPC functions.

The current backend contract covers Google Login, Initial Setup Profile creation, simple photo records, and friend relations. Wake Up Challenge attempt persistence, Failure Cards, and Friends Feed Access are deferred.

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
    skipBrowserRedirect: true
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

- One Profile per authenticated user.
- `profile_id` is the Auth User ID.
- `user_id` is the public User ID and must be unique.
- `display_name` is required.
- Public User ID and Display Name cannot be edited after setup in the MVP.

### Get My Profile

Supabase feature:

- Postgres table select

Frontend call:

```ts
supabase
  .from("profiles")
  .select("id, user_id, display_name, created_at")
  .eq("id", user.id)
  .maybeSingle();
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

## Photo API

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

- Current policies allow users to read their own photo records.
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

- Current policies allow users to insert only their own photo records.

## Friend Relation API

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

- Current policies allow users to read friend relation rows where they are either side.

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

- Current policies allow users to insert relation rows only from their own Profile.
- The database rejects self-relations.
- The database rejects duplicate `(profile_id, friend_profile_id)` rows.

## Deferred APIs

The following APIs from the larger product model are deferred until their backend tables exist:

- Daily Alarm Attempt API
- Challenge Result API
- Failure Card API
- Friends Feed Access API
- Failure photo Storage policies tied to Failure Cards
