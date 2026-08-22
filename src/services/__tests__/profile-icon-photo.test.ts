import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ProfileIconPhotoUploadError,
  uploadProfileIconPhoto,
} from '../profile-icon-photo';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getPublicUrl: vi.fn(),
  getUser: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    storage: {
      from: mocks.from,
    },
  },
}));

function setupStorage() {
  mocks.from.mockReturnValue({
    getPublicUrl: mocks.getPublicUrl,
    upload: mocks.upload,
  });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.getPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://storage.example/auth-user-id/icon.jpg' },
  });
}

describe('uploadProfileIconPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    );
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    });
    setupStorage();
  });

  it('uploads with a caller-provided content type, extension matching', async () => {
    await uploadProfileIconPhoto('file://photo.png', 'image/png');

    expect(mocks.upload).toHaveBeenCalledWith(
      'auth-user-id/icon.png',
      expect.any(ArrayBuffer),
      { contentType: 'image/png', upsert: true },
    );
  });

  it('falls back to image/jpeg when no content type is given', async () => {
    await uploadProfileIconPhoto('file://photo.jpg');

    expect(mocks.upload).toHaveBeenCalledWith(
      'auth-user-id/icon.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: true },
    );
  });

  it('falls back to a .jpg extension for an unrecognized content type', async () => {
    await uploadProfileIconPhoto('file://photo.heif', 'image/heif');

    expect(mocks.upload).toHaveBeenCalledWith(
      'auth-user-id/icon.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/heif', upsert: true },
    );
  });

  it('requires an authenticated user', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('not authenticated'),
    });

    await uploadProfileIconPhoto('file://photo.jpg').catch((error: unknown) => {
      expect(error).toBeInstanceOf(ProfileIconPhotoUploadError);
      expect((error as ProfileIconPhotoUploadError).code).toBe(
        'not_authenticated',
      );
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('maps a Storage upload failure to a typed error', async () => {
    mocks.upload.mockResolvedValue({ error: new Error('storage down') });

    await uploadProfileIconPhoto('file://photo.jpg').catch((error: unknown) => {
      expect(error).toBeInstanceOf(ProfileIconPhotoUploadError);
      expect((error as ProfileIconPhotoUploadError).code).toBe(
        'storage_upload_failed',
      );
    });
  });
});
