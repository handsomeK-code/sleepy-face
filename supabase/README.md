# Supabase: manual schema changes

This repo does not run `supabase db push` or manage a linked Supabase project (see
`docs/database_design.md`: the schema is applied manually). The files under `sql/` are
the source of truth for that manual setup, but someone with access to the Supabase
project must apply them — none of these steps run from app code.

## Profile Icon Photos (2026-08-21)

Lets a user set a custom photo (instead of one of the 8 preset icons) as their profile
icon, both during Initial Setup and from the Profile screen.

1. Run `sql/2026-08-21_profile_icon_photos_bucket.sql` against the project's Postgres
   instance (SQL Editor in the Supabase Dashboard, or `psql`). It creates the
   `profile-icon-photos` Storage bucket and its RLS policies.
2. Check whether `profiles.icon_url` has a CHECK constraint or trigger restricting it to
   the 8 preset identifiers (`docs/database_design.md` describes this as the current
   design, but it may only be enforced by the `create_profile` RPC, not the column
   itself). If such a constraint exists, drop or relax it — the client now writes a full
   `https://` Storage URL to this column via a direct `profiles` update when a user picks
   a custom photo (`create_profile` itself is untouched and still only accepts a preset
   identifier).
