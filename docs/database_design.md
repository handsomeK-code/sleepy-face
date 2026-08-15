# Wake Up Challenge App - Database Design

## Purpose

This document records the recommended Supabase Postgres schema for the MVP.

It covers tables, views, storage, constraints, and unresolved database decisions. API call shapes are documented separately in `api_contract.md`.

## Main Decisions

- Use `profiles` instead of `users` for app profile data because Supabase Auth already owns authenticated users in `auth.users`.
- Use `display_name` instead of `username` to match the project domain language.
- Keep public `user_id` as the immutable friend-search handle.
- Use `icon_url` if an optional profile image field is kept.
- Do not create a custom `user_auth_providers` table for the MVP unless provider-specific audit data becomes necessary.
- Use `failure_cards` plus the `failure-photos` Storage bucket instead of a generic `photos` table.
- Use `friendships` with a canonical profile pair instead of directional `friends_relations` rows.
- Add `daily_attempts` for one Daily Alarm Attempt per user per local date.

## Tables

### profiles

One row per authenticated app user.

| column name | type | constraints / memo |
| --- | --- | --- |
| id | uuid | primary key, references `auth.users(id)` |
| user_id | varchar | unique public User ID used for friend search |
| display_name | varchar | required public Display Name |
| icon_url | varchar | optional profile icon URL, not required for MVP UI |
| created_at | timestamptz | default `now()` |

Constraints:

- `user_id` unique and not null.
- `display_name` not null.
- `user_id` and `display_name` are immutable in the MVP.

### daily_attempts

One row per user per local calendar date where an online scheduled alarm attempt starts.

| column name | type | constraints / memo |
| --- | --- | --- |
| id | uuid | primary key |
| profile_id | uuid | references `profiles(id)` |
| local_date | date | user's local date for the attempt |
| timezone | varchar | IANA timezone string from the device |
| scheduled_for_local | timestamptz | scheduled alarm time as reported by the frontend |
| saved_alarm_local_id | varchar | local Saved Alarm ID |
| state | varchar | `active` or `completed` |
| result | varchar | nullable challenge result |
| face_verified | boolean | result evidence from the challenge |
| correct_quiz_count | integer | should be `3` for success |
| feed_access_until | timestamptz | nullable timestamp for current-day feed access/block logic |
| created_at | timestamptz | default `now()` |
| completed_at | timestamptz | set when attempt finishes |

Allowed `result` values:

- `success`
- `quiz_failure`
- `timeout_failure`
- `bad_photo_failure`
- `active_offline_failure`
- `abandoned_failure`

Constraints:

- Unique `(profile_id, local_date)`.
- `state` should be `active` before completion and `completed` after success or failure.
- Result completion should happen through RPC functions, not direct table updates.

### friendships

Mutual friend relationship between two profiles.

| column name | type | constraints / memo |
| --- | --- | --- |
| id | uuid | primary key |
| profile_id_low | uuid | references `profiles(id)` |
| profile_id_high | uuid | references `profiles(id)` |
| created_by | uuid | references `profiles(id)`, user who added the friend |
| created_at | timestamptz | default `now()` |

Constraints:

- `profile_id_low < profile_id_high` by UUID comparison or enforced in the `add_friend` RPC.
- Unique `(profile_id_low, profile_id_high)`.
- `profile_id_low` and `profile_id_high` cannot be equal.
- No status column is needed because friendship is mutual immediately.

### failure_cards

Friends-visible record created only for Quiz Failure.

| column name | type | constraints / memo |
| --- | --- | --- |
| id | uuid | primary key |
| profile_id | uuid | references `profiles(id)` |
| daily_attempt_id | uuid | references `daily_attempts(id)` |
| photo_path | varchar | path in Supabase Storage bucket `failure-photos` |
| failed_on | date | user's local failure date |
| created_at | timestamptz | default `now()` |

Constraints:

- Unique `daily_attempt_id`.
- `photo_path` not null.
- Failure Cards are not deletable or hideable in the MVP.

## Views

### my_friends

Current user's mutual friends joined with profile public fields.

Fields:

- `friend_profile_id`
- `user_id`
- `display_name`
- `created_at`

### friends_failure_feed

Failure Cards from the current user's friends, newest first.

Fields:

- `id`
- `profile_id`
- `user_id`
- `display_name`
- `photo_path`
- `failed_on`
- `created_at`

### my_failure_cards

Current user's own Failure Cards for Profile, newest first.

Fields:

- `id`
- `photo_path`
- `failed_on`
- `created_at`

## Storage

### failure-photos

Stores uploaded JPEG images for Quiz Failure only.

Recommended object path:

```text
{auth_user_id}/{attempt_id}.jpg
```

Storage rules:

- Users can upload only to their own path.
- Upload should use `upsert: false`.
- Users can read their own Failure Card photos.
- Users can read friends' Failure Card photos only when Friends Feed Access allows it.
- Signed URLs or a controlled signing RPC should be used for display.

## RPC Functions

Required MVP RPC functions:

- `create_profile`
- `start_daily_attempt`
- `complete_challenge_success`
- `record_challenge_failure`
- `search_profiles`
- `add_friend`
- `get_friends_feed_access`

These RPCs should enforce rules that must stay consistent across clients:

- Immutable profile creation
- One Daily Alarm Attempt per local date
- Valid challenge completion
- Quiz-Failure-only Failure Card creation
- Friends Feed Access changes
- Mutual friendship creation

## Row Level Security

RLS policies should enforce:

- Users can read and create only their own profile where appropriate.
- Users cannot edit public User ID or Display Name after creation in the MVP.
- Users can read their own Daily Alarm Attempts.
- Challenge result writes must go through RPC functions.
- Users can read their own friends list.
- Users can read Friends Feed rows only for friends and only when Friends Feed Access allows it.
- Users can read their own Failure Cards even when Friends Feed Access is blocked.
- Users cannot manually insert, update, delete, or hide Failure Cards.

## Initial Draft Mapping

| initial draft table | recommended object | reason |
| --- | --- | --- |
| `users` | `profiles` | avoids confusion with Supabase `auth.users` |
| `user_auth_providers` | Supabase Auth provider identities | custom provider table is unnecessary for MVP |
| `photos` | `failure_cards` + `failure-photos` bucket | photos are only valid when tied to Quiz Failure |
| `friends_relations` | `friendships` | canonical mutual pair prevents duplicate directional rows |

## Unresolved Database Decisions

1. Should `icon_url` be included in the MVP schema now, or postponed until profile icons exist in the UI?
2. Should public `user_id` have format rules such as lowercase only, allowed characters, minimum length, and maximum length?
3. Should `display_name` have a maximum length?
4. Are duplicate Display Names allowed? Current docs imply yes because public `user_id` is the unique identifier.
5. Should `scheduled_for_local` be `timestamptz` or split into local date/time fields? The API currently passes local strings from the device.
6. Should Friends Feed Access use only `daily_attempts.feed_access_until`, or should it have a separate table if access rules become more complex later?
7. Should Storage signed URL creation be handled directly by the frontend or through a controlled RPC to enforce friends-only photo access more strictly?

