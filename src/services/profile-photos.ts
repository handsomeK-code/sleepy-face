import { supabase } from '@/lib/supabase';

export type MyFailurePhoto = {
  photoId: string;
  imageUrl: string;
  createdAt: string;
};

export type ProfilePhotosServiceErrorCode =
  'not_authenticated' | 'unexpected_error';

type PhotoRow = {
  id: string;
  image_url: string;
  created_at: string;
};

export class ProfilePhotosServiceError extends Error {
  constructor(
    public readonly code: ProfilePhotosServiceErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProfilePhotosServiceError';
  }
}

async function getRequiredProfileId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new ProfilePhotosServiceError(
      'not_authenticated',
      'The Profile photo list requires an authenticated user.',
      error,
    );
  }

  return data.user.id;
}

// Profile shows the user's own failure photos, newest first — unlike the Friends Feed,
// this list is never blocked by Friends Feed Access.
export async function listMyFailurePhotos(): Promise<MyFailurePhoto[]> {
  const profileId = await getRequiredProfileId();

  const { data, error } = await supabase
    .from('photos')
    .select('id, image_url, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ProfilePhotosServiceError(
      'unexpected_error',
      'Could not load your failure photos.',
      error,
    );
  }

  return ((data ?? []) as PhotoRow[]).map((row) => ({
    createdAt: row.created_at,
    imageUrl: row.image_url,
    photoId: row.id,
  }));
}
