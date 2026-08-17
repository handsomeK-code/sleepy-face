import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const FAILURE_PHOTO_BUCKET = 'failure-photos';
const FAILURE_PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}failure-photos/`;

type SavedFailurePhoto = {
  uri: string;
  savedAt: string;
};

type UploadedFailurePhoto = {
  localUri: string;
  storagePath: string;
};

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
    throw new Error('アップロードする写真がローカルにありません。');
  }

  // Supabase Storageでは、ユーザーや日時でファイル名を分けると上書きを避けやすい。
  const storagePath = `local-test/${Date.now()}.jpg`;
  const photoResponse = await fetch(localPhotoUri);
  const photoBody = await photoResponse.arrayBuffer();

  const { error } = await supabase.storage
    .from(FAILURE_PHOTO_BUCKET)
    .upload(storagePath, photoBody, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    localUri: localPhotoUri,
    storagePath,
  } satisfies UploadedFailurePhoto;
}
