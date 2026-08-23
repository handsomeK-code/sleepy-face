# Use Current Photo Records For Quiz Failure Upload Service

## Implementation Status (2026-08-23)

Implemented by `src/services/wakeChallenge.ts`, `src/services/quiz.ts`, and `src/app/quiz-failure-photo.tsx`. A successful `photos` insert can additionally drive the separately deployed `push-on-failure` Edge Function through an externally configured Database Webhook. See [`../current_implementation_spec.md`](../current_implementation_spec.md).

The service-only Quiz Failure slice should provide production-ready behavior against the current Supabase schema by uploading to the `failure-photos` Storage bucket and inserting a `photos` row for the current user. The service should name this as a quiz-failure photo record rather than pretending it creates a final Failure Card table row, because the current backend does not include `failure_cards`, `daily_attempts`, or Friends Feed Access persistence.
