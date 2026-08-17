import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  UserServiceError,
  createProfile,
  getMyProfile,
  validateInitialSetupInput,
} from '../user';

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

function setupProfileQuery() {
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
}

function expectUserServiceError(
  error: unknown,
  code: UserServiceError['code'],
) {
  expect(error).toBeInstanceOf(UserServiceError);
  expect((error as UserServiceError).code).toBe(code);
}

describe('user service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupProfileQuery();
  });

  it('returns null when there is no authenticated user', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('not authenticated'),
    });

    await expect(getMyProfile()).resolves.toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns null when the authenticated user has no Profile yet', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(getMyProfile()).resolves.toBeNull();
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'auth-user-id');
  });

  it('returns the current Profile when Initial Setup is complete', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        created_at: '2026-08-16T00:00:00.000Z',
        display_name: 'Sleepy User',
        id: 'auth-user-id',
        user_id: 'sleepy-user',
      },
      error: null,
    });

    await expect(getMyProfile()).resolves.toEqual({
      createdAt: '2026-08-16T00:00:00.000Z',
      displayName: 'Sleepy User',
      id: 'auth-user-id',
      userId: 'sleepy-user',
    });
  });

  it('creates a Profile with public User ID and Display Name', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        data: {
          created_at: '2026-08-16T00:00:00.000Z',
          display_name: 'Sleepy User',
          profile_id: 'auth-user-id',
          user_id: 'sleepy-user',
        },
        status: 'ok',
      },
      error: null,
    });

    await expect(
      createProfile({
        displayName: 'Sleepy User',
        publicUserId: 'sleepy-user',
      }),
    ).resolves.toEqual({
      createdAt: '2026-08-16T00:00:00.000Z',
      displayName: 'Sleepy User',
      id: 'auth-user-id',
      userId: 'sleepy-user',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('create_profile', {
      display_name: 'Sleepy User',
      user_id: 'sleepy-user',
    });
  });

  it('maps duplicate public User ID to a typed user-service error', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        code: 'user_id_already_taken',
        error: 'User ID is already taken.',
        status: 'error',
      },
      error: null,
    });

    await createProfile({
      displayName: 'Sleepy User',
      publicUserId: 'sleepy-user',
    }).catch((error: unknown) => {
      expectUserServiceError(error, 'user_id_already_taken');
    });
  });

  it('maps already-created Profile to a typed user-service error', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        code: 'profile_already_created',
        error: 'Profile already exists.',
        status: 'error',
      },
      error: null,
    });

    await createProfile({
      displayName: 'Sleepy User',
      publicUserId: 'sleepy-user',
    }).catch((error: unknown) => {
      expectUserServiceError(error, 'profile_already_created');
    });
  });

  it('maps not-authenticated Profile creation to a typed user-service error', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        code: 'not_authenticated',
        error: 'Authentication is required.',
        status: 'error',
      },
      error: null,
    });

    await createProfile({
      displayName: 'Sleepy User',
      publicUserId: 'sleepy-user',
    }).catch((error: unknown) => {
      expectUserServiceError(error, 'not_authenticated');
    });
  });

  it('maps Supabase RPC failures to unexpected user-service errors', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: new Error('network failed'),
    });

    await createProfile({
      displayName: 'Sleepy User',
      publicUserId: 'sleepy-user',
    }).catch((error: unknown) => {
      expectUserServiceError(error, 'unexpected_error');
    });
  });
});

describe('validateInitialSetupInput', () => {
  it('normalizes public User ID and trims Display Name', () => {
    expect(
      validateInitialSetupInput({
        displayName: ' Sleepy User ',
        publicUserId: ' Sleepy-USER_01 ',
      }),
    ).toEqual({
      isValid: true,
      value: {
        displayName: 'Sleepy User',
        publicUserId: 'sleepy-user_01',
      },
    });
  });

  it('rejects public User IDs outside the allowed handle shape', () => {
    expect(
      validateInitialSetupInput({
        displayName: 'Sleepy User',
        publicUserId: 'sleepy user',
      }),
    ).toEqual({
      code: 'public_user_id_invalid',
      isValid: false,
    });
  });

  it('rejects empty Display Name after trimming', () => {
    expect(
      validateInitialSetupInput({
        displayName: '   ',
        publicUserId: 'sleepy-user',
      }),
    ).toEqual({
      code: 'display_name_required',
      isValid: false,
    });
  });

  it('rejects Display Names longer than thirty visible characters', () => {
    expect(
      validateInitialSetupInput({
        displayName: 'あ'.repeat(31),
        publicUserId: 'sleepy-user',
      }),
    ).toEqual({
      code: 'display_name_too_long',
      isValid: false,
    });
  });
});
