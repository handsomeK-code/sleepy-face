import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  activateWakeFriendAlarm,
  listWakeFriendTargets,
} from '../wake-friends';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  functionsInvoke: vi.fn(),
  gte: vi.fn(),
  in: vi.fn(),
  is: vi.fn(),
  listFriends: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/services/friend', () => ({
  listFriends: mocks.listFriends,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    functions: {
      invoke: mocks.functionsInvoke,
    },
  },
}));

const friendA = {
  createdAt: '2026-08-20T00:00:00.000Z',
  displayName: '友達A',
  iconId: 'human' as const,
  id: 'profile-a',
  relationId: 'relation-a',
  userId: 'friend_a',
};

const friendB = {
  createdAt: '2026-08-21T00:00:00.000Z',
  displayName: '友達B',
  iconId: 'woman' as const,
  id: 'profile-b',
  relationId: 'relation-b',
  userId: 'friend_b',
};

describe('listWakeFriendTargets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ in: mocks.in });
    mocks.in.mockReturnValue({ is: mocks.is });
    mocks.is.mockReturnValue({ gte: mocks.gte });
  });

  it('returns only Friends with an unconsumed failure entry', async () => {
    mocks.listFriends.mockResolvedValue([friendA, friendB]);
    mocks.gte.mockResolvedValue({
      data: [{ id: 'entry-b', profile_id: 'profile-b' }],
      error: null,
    });

    await expect(
      listWakeFriendTargets(new Date('2026-08-23T02:00:00.000Z')),
    ).resolves.toEqual([{ ...friendB, failureEntryId: 'entry-b' }]);
    expect(mocks.from).toHaveBeenCalledWith('failure_log_entries');
    expect(mocks.select).toHaveBeenCalledWith('id, profile_id');
    expect(mocks.in).toHaveBeenCalledWith('profile_id', [
      'profile-a',
      'profile-b',
    ]);
    expect(mocks.is).toHaveBeenCalledWith('activated_at', null);
    expect(mocks.gte).toHaveBeenCalledWith(
      'created_at',
      '2026-08-22T15:00:00.000Z',
    );
  });

  it('keeps one card per Friend when multiple failures are unconsumed', async () => {
    mocks.listFriends.mockResolvedValue([friendA]);
    mocks.gte.mockResolvedValue({
      data: [
        { id: 'entry-newest', profile_id: 'profile-a' },
        { id: 'entry-older', profile_id: 'profile-a' },
      ],
      error: null,
    });

    await expect(listWakeFriendTargets()).resolves.toEqual([
      { ...friendA, failureEntryId: 'entry-newest' },
    ]);
  });

  it('skips the failure query when there are no Friends', async () => {
    mocks.listFriends.mockResolvedValue([]);

    await expect(listWakeFriendTargets()).resolves.toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('surfaces a failure-log query error', async () => {
    mocks.listFriends.mockResolvedValue([friendA]);
    mocks.gte.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(listWakeFriendTargets()).rejects.toThrow('boom');
  });
});

describe('activateWakeFriendAlarm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates activation to the existing remote alarm service', async () => {
    mocks.functionsInvoke.mockResolvedValue({ data: { sent: 1 }, error: null });

    await activateWakeFriendAlarm('entry-a');

    expect(mocks.functionsInvoke).toHaveBeenCalledWith('activate-alarm', {
      body: { entryId: 'entry-a' },
    });
  });

  it('surfaces an alarm activation error', async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: new Error('boom'),
    });

    await expect(activateWakeFriendAlarm('entry-a')).rejects.toThrow('boom');
  });
});
