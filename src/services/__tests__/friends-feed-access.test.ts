import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FriendsFeedAccessServiceError,
  clearFriendsFeedAccessBlock,
  getFriendsFeedAccessState,
  recordFailureAccessOutcome,
} from '../friends-feed-access';

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mocks.getItem,
    removeItem: mocks.removeItem,
    setItem: mocks.setItem,
  },
}));

function expectServiceError(
  error: unknown,
  code: FriendsFeedAccessServiceError['code'],
) {
  expect(error).toBeInstanceOf(FriendsFeedAccessServiceError);
  expect((error as FriendsFeedAccessServiceError).code).toBe(code);
}

describe('Friends Feed Access service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T00:00:00.000Z'));
    mocks.getItem.mockResolvedValue(null);
    mocks.removeItem.mockResolvedValue(undefined);
    mocks.setItem.mockResolvedValue(undefined);
  });

  it('reads allowed when no block is stored', async () => {
    await expect(getFriendsFeedAccessState()).resolves.toBe('allowed');
  });

  it('reads blocked when a block is stored for today', async () => {
    mocks.getItem.mockResolvedValue('2026-08-19');

    await expect(getFriendsFeedAccessState()).resolves.toBe('blocked');
  });

  it('reads allowed when the stored block is from an earlier day', async () => {
    mocks.getItem.mockResolvedValue('2026-08-18');

    await expect(getFriendsFeedAccessState()).resolves.toBe('allowed');
  });

  it('persists a block for a no-photo failure reason', async () => {
    await recordFailureAccessOutcome('no-photo-timeout');

    expect(mocks.setItem).toHaveBeenCalledWith(
      'sleepy-face:friends-feed-access-block',
      '2026-08-19',
    );
  });

  it('persists a block for every blocked failure reason', async () => {
    await recordFailureAccessOutcome('app-quit');
    await recordFailureAccessOutcome('bad-photo-limit');
    await recordFailureAccessOutcome('quiz-upload-failed');

    expect(mocks.setItem).toHaveBeenCalledTimes(3);
  });

  it('clears any stored block for an allowed (quiz-timeout) outcome', async () => {
    await recordFailureAccessOutcome('quiz-timeout');

    expect(mocks.setItem).not.toHaveBeenCalled();
    expect(mocks.removeItem).toHaveBeenCalledWith(
      'sleepy-face:friends-feed-access-block',
    );
  });

  it('clears the stored block directly', async () => {
    await clearFriendsFeedAccessBlock();

    expect(mocks.removeItem).toHaveBeenCalledWith(
      'sleepy-face:friends-feed-access-block',
    );
  });

  it('wraps a storage read failure in a typed service error', async () => {
    mocks.getItem.mockRejectedValue(new Error('boom'));

    await expect(getFriendsFeedAccessState()).rejects.toSatisfy((error) => {
      expectServiceError(error, 'storage_read_failed');
      return true;
    });
  });

  it('wraps a storage write failure in a typed service error', async () => {
    mocks.setItem.mockRejectedValue(new Error('boom'));

    await expect(
      recordFailureAccessOutcome('no-photo-timeout'),
    ).rejects.toSatisfy((error) => {
      expectServiceError(error, 'storage_write_failed');
      return true;
    });
  });

  it('wraps a storage clear failure in a typed service error', async () => {
    mocks.removeItem.mockRejectedValue(new Error('boom'));

    await expect(clearFriendsFeedAccessBlock()).rejects.toSatisfy((error) => {
      expectServiceError(error, 'storage_clear_failed');
      return true;
    });
  });
});
