# Wake Up Challenge App - Database Design

## Purpose

This document records the current Supabase Postgres schema for the app.

The current online Supabase setup is intentionally smaller than the full product model. It supports Google Login, Initial Setup, simple photo records, and friend relations. Wake Up Challenge attempt tracking and Failure Card-specific persistence are deferred.

## Main Decisions

- Use Supabase Auth's built-in `auth.users` table for authenticated accounts.
- Do not create an app-owned `users` table.
- Do not create `user_auth_providers`; Google provider identity is owned by Supabase Auth.
- Use `profiles` for app profile data tied one-to-one to `auth.users`.
- Use `display_name` in code and docs instead of `username`.
- Keep `user_id` as the public immutable User ID for Friend Search.
- Keep `icon_url` as an optional profile image field, even though profile icons are not required in the MVP UI.
- Use simple `photos` records for uploaded image URLs in the current schema.
- Use `friends_relations` for directional friend relation rows in the current schema.
- Defer `daily_attempts`, `failure_cards`, canonical `friendships`, feed access persistence, and Failure Card-specific storage rules until the Wake Up Challenge backend is implemented.

## Tables

### profiles

One row per authenticated app user. The row ID is the Auth User ID from Supabase Auth.

| column name  | type        | constraints / memo                                     |
| ------------ | ----------- | ------------------------------------------------------ |
| `id`         | uuid        | primary key, references `auth.users(id)`               |
| `user_id`    | varchar     | unique public User ID used for Friend Search           |
| `display_name` | varchar  | required public Display Name                           |
| `icon_url`   | varchar     | optional profile icon URL                              |
| `created_at` | timestamptz | default `now()`                                        |

Rules:

- `profiles.id` is the internal Auth User ID.
- `profiles.user_id` is the public User ID.
- `profiles.user_id` must not be confused with the Auth User ID.
- A user can create only their own Profile.
- Public User ID and Display Name are immutable for the MVP.

### photos

Simple image records associated with a Profile.

| column name  | type        | constraints / memo                       |
| ------------ | ----------- | ---------------------------------------- |
| `id`         | uuid        | primary key, default `gen_random_uuid()` |
| `profile_id` | uuid        | references `profiles(id)`                |
| `image_url`  | varchar     | image URL                                |
| `created_at` | timestamptz | default `now()`                          |

Rules:

- Users can read and insert only their own photo records in the current policy set.
- This table is not yet the final Failure Card model.

### friends_relations

Directional friend relation rows between Profiles.

| column name         | type        | constraints / memo                       |
| ------------------- | ----------- | ---------------------------------------- |
| `id`                | uuid        | primary key, default `gen_random_uuid()` |
| `profile_id`        | uuid        | references `profiles(id)`                |
| `friend_profile_id` | uuid        | references `profiles(id)`                |
| `created_at`        | timestamptz | default `now()`                          |

Rules:

- `profile_id` and `friend_profile_id` cannot be the same Profile.
- `(profile_id, friend_profile_id)` is unique.
- The current policy allows a user to insert relations only from their own Profile.
- The current policy allows a user to read relations where they are either side of the relation.

## RPC Functions

### create_profile

Creates the authenticated user's Profile after Google Login.

Inputs:

| argument       | type | memo                          |
| -------------- | ---- | ----------------------------- |
| `user_id`      | text | public User ID                |
| `display_name` | text | public Display Name           |

Success payload:

```json
{
  "status": "ok",
  "data": {
    "profile_id": "uuid",
    "user_id": "public-user-id",
    "display_name": "Display Name",
    "created_at": "timestamp"
  }
}
```

Error codes:

- `not_authenticated`
- `profile_already_created`
- `user_id_already_taken`

## Row Level Security

Current RLS policies:

- Authenticated users can read Profiles for Friend Search.
- Authenticated users can insert only their own Profile.
- Profiles cannot be updated or deleted through current app policies.
- Authenticated users can read and insert only their own photo records.
- Authenticated users can read friend relation rows where they are either side.
- Authenticated users can insert friend relation rows only from their own Profile.

## Deferred Backend Tables

These tables were part of the larger MVP design, but they are not in the current manual Supabase schema:

- `daily_attempts`
- `failure_cards`
- canonical mutual `friendships`

Add them later when implementing Wake Up Challenge result persistence, Friends Feed Access, and Failure Card behavior.
