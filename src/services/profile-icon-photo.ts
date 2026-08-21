import { supabase } from '@/lib/supabase';

const PROFILE_ICON_PHOTO_BUCKET = 'profile-icon-photos';

export type ProfileIconPhotoUploadErrorCode =
  'not_authenticated' | 'storage_upload_failed';

export class ProfileIconPhotoUploadError extends Error {
  constructor(
    public readonly code: ProfileIconPhotoUploadErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProfileIconPhotoUploadError';
  }
}

// Uploads a locally-picked image (a file:// URI from expo-image-picker) to Storage and
// returns its public URL, which the caller stores directly in profiles.icon_url.
export async function uploadProfileIconPhoto(
  localPhotoUri: string,
): Promise<string> {
  const userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    throw new ProfileIconPhotoUploadError(
      'not_authenticated',
      'Profile icon photo upload requires an authenticated user.',
      userResult.error,
    );
  }

  const profileId = userResult.data.user.id;

  // Overwriting the same path keeps a user from accumulating an old icon photo per change.
  const storagePath = `${profileId}/icon.jpg`;
  const photoResponse = await fetch(localPhotoUri);
  const photoBody = await photoResponse.arrayBuffer();

  const { error } = await supabase.storage
    .from(PROFILE_ICON_PHOTO_BUCKET)
    .upload(storagePath, photoBody, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new ProfileIconPhotoUploadError(
      'storage_upload_failed',
      'Profile icon photo Storage upload failed.',
      error,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from(PROFILE_ICON_PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  // A fixed storage path means the CDN/browser can serve a stale cached image after an
  // upsert; a cache-busting query param forces a fresh fetch without changing the path.
  return `${publicUrl}?v=${Date.now()}`;
}
