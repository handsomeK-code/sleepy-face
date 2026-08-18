# Use Current Photo Records For Quiz Failure Upload Service

The service-only Quiz Failure slice should provide production-ready behavior against the current Supabase schema by uploading to the `failure-photos` Storage bucket and inserting a `photos` row for the current user. The service should name this as a quiz-failure photo record rather than pretending it creates a final Failure Card table row, because the current backend does not include `failure_cards`, `daily_attempts`, or Friends Feed Access persistence.
