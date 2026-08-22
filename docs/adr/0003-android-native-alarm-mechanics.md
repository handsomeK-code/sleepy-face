# Android Native Alarm Mechanics

## Implementation Status (2026-08-23)

Implemented by `modules/alarm-ringing/`, `src/services/android-alarm-mechanics.ts`, and `src/services/alarm.ts`. The current module also supports Saved Alarm occurrences, selected bundled sounds, a 180-second native safety stop, and enabled-alarm resynchronization after Android boot. See [`../current_implementation_spec.md`](../current_implementation_spec.md).

For the MVP, Android Alarm Mechanics use native Android scheduling and ringing code rather than an Expo-only notification flow. The app needs alarm behavior that can ring while the React Native process is not running, including backgrounded, swiped-away/process-dead, and locked-screen cases when Android permissions and device policy allow it. Expo-only JavaScript scheduling is not enough for this because JavaScript may not be alive when the alarm fires.

The Android implementation should use exact Android alarm APIs, a native receiver, Android default alarm tone playback, and an Android-compliant full-screen notification or launch path to open the app to the ringing page. The TypeScript layer should expose a small wrapper for scheduling the 20-second test alarm, checking/opening exact alarm settings, checking/requesting notification permission, reading current ringing state, canceling a scheduled test alarm, and stopping ringing. iOS is out of scope for this decision.

This choice adds native Kotlin work and requires a rebuilt native Android app whenever native code changes, but it matches the product goal of a normal-alarm-like interruption. Force-stop from Android Settings remains out of scope because Android intentionally blocks app receivers after force-stop.
