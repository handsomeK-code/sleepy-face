# Android Face Proof

Android Face Proof uses local Google ML Kit face detection to check whether a saved challenge photo contains at least one human face. It is face detection only: it does not recognize the user, compare against a registered face, or perform biometric verification.

## Test Surface

Use the face-check screen as the current Android device test surface.

Expected behavior:

- Capturing a selfie saves the photo into app local storage.
- Face Proof runs automatically after the local save.
- A photo with one or more detected faces passes and remains visible.
- A photo with no detected faces fails, is deleted, and clears the preview.
- Invalid-photo and detector-error states show recoverable status text and do not count as no-face failures in this slice.
- A passed photo can still use the existing upload test button.

## Manual Android Verification

1. Rebuild and install the native Android app. Expo Go is not an acceptance path because the ML Kit detector is native code.
2. Open the face-check screen.
3. Capture a normal front-camera selfie and confirm the screen reports Face Proof success with a detected face count.
4. Confirm the accepted photo remains visible after success.
5. Capture a no-face image, such as a blank wall or covered camera, and confirm the screen reports that no face was detected.
6. Confirm the no-face failed photo is removed from the preview.
7. Repeat capture after a pass and after a no-face failure to confirm the screen recovers.
8. If practical during development, pass an invalid or unreadable local URI through the service and confirm it returns invalid-photo instead of crashing.

## Out Of Scope For This Slice

- Face recognition or identity matching.
- Requiring exactly one face.
- Liveness, spoofing, smile, eye-open, landmark, contour, or head-angle checks.
- Server-side face detection.
- iOS, web, or Expo Go support.
- Photo Timer behavior.
- Bad Photo Attempt counting in the final Wake Up Challenge flow.
- Three Bad Photo Attempts causing Challenge Failure.
- Automatic navigation from Face Proof success to Quiz.
