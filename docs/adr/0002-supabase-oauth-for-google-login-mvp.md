# Supabase OAuth For Google Login MVP

For the MVP, Google Login uses Supabase Auth OAuth through a browser-based Expo auth session instead of a native Google Sign-In library. We considered a native Google flow using a Google ID token plus Supabase `signInWithIdToken`, but chose Supabase OAuth-only because it avoids native Google Sign-In setup, keeps the first service implementation simpler, and matches the MVP's need for authentication without requiring native One Tap or Credential Manager behavior.

The mobile service should call Supabase `signInWithOAuth` with `skipBrowserRedirect`, open the returned URL through `expo-web-browser`, and establish the Supabase session from the returned access and refresh tokens. Native Google Sign-In can be revisited later if the product requires a more platform-native Google Login experience.
