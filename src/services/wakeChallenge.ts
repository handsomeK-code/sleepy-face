import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const FAILURE_PHOTO_BUCKET = 'failure-photos';
const FAILURE_PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}failure-photos/`;

type SavedFailurePhoto = {
  uri: string;
  savedAt: string;
};

export type UploadedFailurePhoto = {
  imageUrl: string;
  localUri: string;
  photoRecord: PhotoRecord;
  storagePath: string;
};

type PhotoRecordRow = {
  id: string;
  profile_id: string;
  image_url: string;
  created_at: string;
};

export type PhotoRecord = {
  id: string;
  profileId: string;
  imageUrl: string;
  createdAt: string;
};

export type FailurePhotoUploadErrorCode =
  | 'local_photo_missing'
  | 'not_authenticated'
  | 'storage_upload_failed'
  | 'photo_record_insert_failed';

export class FailurePhotoUploadError extends Error {
  constructor(
    public readonly code: FailurePhotoUploadErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FailurePhotoUploadError';
  }
}

function mapPhotoRecord(row: PhotoRecordRow): PhotoRecord {
  return {
    createdAt: row.created_at,
    id: row.id,
    imageUrl: row.image_url,
    profileId: row.profile_id,
  };
}

async function ensureFailurePhotoDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('ローカル保存先が見つかりません。');
  }

  // Keep captured photos in app-owned storage for later upload.
  const directory = await FileSystem.getInfoAsync(FAILURE_PHOTO_DIR);

  if (!directory.exists) {
    await FileSystem.makeDirectoryAsync(FAILURE_PHOTO_DIR, {
      intermediates: true,
    });
  }
}

export async function saveFailurePhotoLocally(photoUri: string) {
  await ensureFailurePhotoDirectory();

  // A unique file per photo avoids Android image-cache and overwrite drift.
  const savedAt = new Date().toISOString();
  const localPhotoPath = `${FAILURE_PHOTO_DIR}failure-photo-${Date.now()}.jpg`;

  // Copy the camera temp file into documentDirectory so it can be read later.
  await FileSystem.copyAsync({
    from: photoUri,
    to: localPhotoPath,
  });

  return {
    uri: localPhotoPath,
    savedAt,
  } satisfies SavedFailurePhoto;
}

export async function getLatestFailurePhoto() {
  await ensureFailurePhotoDirectory();

  const fileNames = await FileSystem.readDirectoryAsync(FAILURE_PHOTO_DIR);
  const photoNames = fileNames
    .filter((fileName) => fileName.startsWith('failure-photo-'))
    .sort()
    .reverse();

  if (photoNames.length === 0) {
    return null;
  }

  return {
    uri: `${FAILURE_PHOTO_DIR}${photoNames[0]}`,
  };
}

const DEBUG_LAST_FAILED_FACE_PROOF_PATH = `${FileSystem.documentDirectory ?? ''}debug-last-failed-face-proof.jpg`;

// TEMPORARY diagnostic aid for face-proof-keeps-failing investigation; remove once resolved.
export async function debugSnapshotBeforeDelete(localPhotoUri: string) {
  try {
    const existing = await FileSystem.getInfoAsync(
      DEBUG_LAST_FAILED_FACE_PROOF_PATH,
    );

    if (existing.exists) {
      await FileSystem.deleteAsync(DEBUG_LAST_FAILED_FACE_PROOF_PATH, {
        idempotent: true,
      });
    }

    await FileSystem.copyAsync({
      from: localPhotoUri,
      to: DEBUG_LAST_FAILED_FACE_PROOF_PATH,
    });
  } catch {
    // Best-effort diagnostic snapshot only; never block the real delete flow.
  }
}

export async function deleteFailurePhotoLocally(localPhotoUri: string) {
  const localPhoto = await FileSystem.getInfoAsync(localPhotoUri);

  if (!localPhoto.exists) {
    return;
  }

  await FileSystem.deleteAsync(localPhotoUri, {
    idempotent: true,
  });
}

export async function uploadFailurePhoto(localPhotoUri: string) {
  const localPhoto = await FileSystem.getInfoAsync(localPhotoUri);

  if (!localPhoto.exists) {
    throw new FailurePhotoUploadError(
      'local_photo_missing',
      'Upload requires an existing local failure photo.',
    );
  }

  const userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    throw new FailurePhotoUploadError(
      'not_authenticated',
      'Failure photo upload requires an authenticated user.',
      userResult.error,
    );
  }

  const profileId = userResult.data.user.id;

  // Scope by Auth User ID and timestamp to avoid cross-user or retake collisions.
  const storagePath = `${profileId}/${Date.now()}.jpg`;
  const photoResponse = await fetch(localPhotoUri);
  const photoBody = await photoResponse.arrayBuffer();

  const { error } = await supabase.storage
    .from(FAILURE_PHOTO_BUCKET)
    .upload(storagePath, photoBody, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new FailurePhotoUploadError(
      'storage_upload_failed',
      'Failure photo Storage upload failed.',
      error,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(FAILURE_PHOTO_BUCKET).getPublicUrl(storagePath);

  // Current-schema feed/profile reads consume photos.image_url.
  const { data: photoRecord, error: photoRecordError } = await supabase
    .from('photos')
    .insert({
      image_url: publicUrl,
      profile_id: profileId,
    })
    .select('id, profile_id, image_url, created_at')
    .single();

  if (photoRecordError || !photoRecord) {
    throw new FailurePhotoUploadError(
      'photo_record_insert_failed',
      'Failure photo record insert failed.',
      photoRecordError,
    );
  }

  return {
    imageUrl: publicUrl,
    localUri: localPhotoUri,
    photoRecord: mapPhotoRecord(photoRecord),
    storagePath,
  } satisfies UploadedFailurePhoto;
}
