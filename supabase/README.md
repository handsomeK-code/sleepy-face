# Supabase: manual schema changes

This repo does not run `supabase db push` or manage a linked Supabase project (see
`docs/database_design.md`: the schema is applied manually). The files under `sql/` are
the source of truth for that manual setup, but someone with access to the Supabase
project must apply them — none of these steps run from app code.

## Profile Icon Photos (2026-08-21)

Lets a user set a custom photo (instead of one of the 8 preset icons) as their profile
icon, both during Initial Setup and from the Profile screen.

Project: `sleepy-face`, ref `mgtxrvwgezcqupgjuxzq`.

### 1. Create the Storage bucket + policies

1. Open the SQL Editor: https://supabase.com/dashboard/project/mgtxrvwgezcqupgjuxzq/sql/new
2. Open `sql/2026-08-21_profile_icon_photos_bucket.sql` in this repo, copy its full
   contents, paste into the SQL Editor.
3. Click **Run** (or Cmd/Ctrl+Enter). It should finish with "Success. No rows returned".
4. Verify: go to **Storage** in the left sidebar
   (https://supabase.com/dashboard/project/mgtxrvwgezcqupgjuxzq/storage/buckets) — a
   `profile-icon-photos` bucket should now be listed, marked **Public**.

If it errors with `policy already exists` (e.g. you're re-running after a partial
failure), that one `create policy` statement already applied — drop it first
(`drop policy "<name>" on storage.objects;`) or comment out the line and re-run.

### 2. Check for a constraint blocking custom photo URLs

`profiles.icon_url` is documented as "one of 8 preset identifiers", but that may only be
enforced by the `create_profile` RPC (which the client still calls with only a preset
value) rather than by the column itself. Confirm there's no separate constraint blocking
a direct `update` from writing a full `https://` URL there:

1. In the same SQL Editor, run:
   ```sql
   select conname, pg_get_constraintdef(oid)
   from pg_constraint
   where conrelid = 'public.profiles'::regclass;

   select tgname, pg_get_triggerdef(oid)
   from pg_trigger
   where tgrelid = 'public.profiles'::regclass and not tgisinternal;
   ```
2. If either query returns something that restricts `icon_url` to the 8 preset values
   (e.g. a `CHECK (icon_url IN (...))` constraint, or a trigger validating it), drop it:
   ```sql
   alter table public.profiles drop constraint <the_constraint_name>;
   -- or
   drop trigger <the_trigger_name> on public.profiles;
   ```
3. If both queries return no rows (most likely — the codebase's existing
   `updateProfile()` already free-writes `icon_url` for the 8 presets with no DB-side
   validation), there's nothing to do here.

### 3. Confirm it works end-to-end

In the app, open 設定 (Profile) → 写真を選ぶ → pick a photo → crop → confirm. It should
save without the "写真をアップロードできませんでした" error, and the picked photo should
show as the avatar (persists after closing and reopening the screen).

## Photo Reactions (2026-08-22)

Lets a viewer react to a friend's photo in the Home feed with a single 😂 (a toggle, not
a multi-emoji picker). Comments are a separate feature and are not part of this.

1. Open the SQL Editor: https://supabase.com/dashboard/project/mgtxrvwgezcqupgjuxzq/sql/new
2. Open `sql/2026-08-22_photo_reactions.sql` in this repo, copy its full contents, paste
   into the SQL Editor, and click **Run**. It should finish with "Success. No rows
   returned". This creates the `photo_reactions` table and its RLS policies.
3. Verify: **Table Editor** in the left sidebar
   (https://supabase.com/dashboard/project/mgtxrvwgezcqupgjuxzq/editor) should now list a
   `photo_reactions` table.
4. Confirm it works end-to-end: in the app, open ホーム and tap the 😂 button under a
   friend's photo. The count should increment immediately and persist after a pull-to-
   refresh; tapping again should remove it.
