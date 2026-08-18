import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const FAILURE_PHOTO_BUCKET = 'failure-photos';
const FAILURE_PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}failure-photos/`;

type SavedFailurePhoto = {
  uri: string;
  savedAt: string;
};

type UploadedFailurePhoto = {
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

  // 撮影した写真をアプリ内に残すためのフォルダを用意する。
  const directory = await FileSystem.getInfoAsync(FAILURE_PHOTO_DIR);

  if (!directory.exists) {
    await FileSystem.makeDirectoryAsync(FAILURE_PHOTO_DIR, {
      intermediates: true,
    });
  }
}

export async function saveFailurePhotoLocally(photoUri: string) {
  await ensureFailurePhotoDirectory();

  // 写真ごとに別ファイル名へ保存すると、Android側の画像キャッシュや上書きズレを避けられる。
  const savedAt = new Date().toISOString();
  const localPhotoPath = `${FAILURE_PHOTO_DIR}failure-photo-${Date.now()}.jpg`;

  // Cameraの一時ファイルを、あとから取得できるdocumentDirectoryへコピーする。
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

  // ユーザーIDと日時でファイルを分けると、他ユーザーの写真や再撮影分と衝突しにくい。
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

  // 現在のMVPでは、feed/profile 側が photos テーブルの image_url を読む前提になっている。
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
