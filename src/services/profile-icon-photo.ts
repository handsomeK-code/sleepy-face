import { supabase } from '@/lib/supabase';

const PROFILE_ICON_PHOTO_BUCKET = 'profile-icon-photos';
const DEFAULT_PHOTO_CONTENT_TYPE = 'image/jpeg';

const PHOTO_CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensionForContentType(contentType: string): string {
  return PHOTO_CONTENT_TYPE_EXTENSIONS[contentType] ?? 'jpg';
}

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
  contentType: string = DEFAULT_PHOTO_CONTENT_TYPE,
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

  // Overwriting the same path keeps a user from accumulating an old icon photo per change;
  // the extension tracks contentType so a downstream consumer trusting the extension (an
  // image proxy/CDN) doesn't see a mismatched extension/content-type/bytes triple.
  const storagePath = `${profileId}/icon.${extensionForContentType(contentType)}`;
  const photoResponse = await fetch(localPhotoUri);
  const photoBody = await photoResponse.arrayBuffer();

  const { error } = await supabase.storage
    .from(PROFILE_ICON_PHOTO_BUCKET)
    .upload(storagePath, photoBody, {
      contentType,
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
