import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ProfilePhotosServiceError,
  listMyFailurePhotos,
} from '../profile-photos';

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}));

function mockAuthenticatedUser(id = 'profile-a') {
  mocks.getUser.mockResolvedValue({
    data: { user: { id } },
    error: null,
  });
}

function expectServiceError(
  error: unknown,
  code: ProfilePhotosServiceError['code'],
) {
  expect(error).toBeInstanceOf(ProfilePhotosServiceError);
  expect((error as ProfilePhotosServiceError).code).toBe(code);
}

describe('profile photos service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ order: mocks.order });
  });

  it('lists the current user own failure photos, newest first', async () => {
    mockAuthenticatedUser();
    mocks.order.mockResolvedValue({
      data: [
        {
          created_at: '2026-08-19T00:00:00.000Z',
          id: 'photo-1',
          image_url: 'https://storage.example/photo-1.jpg',
        },
      ],
      error: null,
    });

    await expect(listMyFailurePhotos()).resolves.toEqual([
      {
        createdAt: '2026-08-19T00:00:00.000Z',
        imageUrl: 'https://storage.example/photo-1.jpg',
        photoId: 'photo-1',
      },
    ]);

    expect(mocks.from).toHaveBeenCalledWith('photos');
    expect(mocks.eq).toHaveBeenCalledWith('profile_id', 'profile-a');
    expect(mocks.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  });

  it('returns an empty list when there are no photos', async () => {
    mockAuthenticatedUser();
    mocks.order.mockResolvedValue({ data: null, error: null });

    await expect(listMyFailurePhotos()).resolves.toEqual([]);
  });

  it('requires authentication', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('not authenticated'),
    });

    await expect(listMyFailurePhotos()).rejects.toSatisfy((error) => {
      expectServiceError(error, 'not_authenticated');
      return true;
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('wraps a Supabase error', async () => {
    mockAuthenticatedUser();
    mocks.order.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(listMyFailurePhotos()).rejects.toSatisfy((error) => {
      expectServiceError(error, 'unexpected_error');
      return true;
    });
  });
});
