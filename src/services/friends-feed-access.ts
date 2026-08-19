import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLocalDay } from '@/services/wake-challenge-attempt';
import {
  getFailureAccessOutcome,
  type WakeChallengeFailureReason,
} from '@/services/wake-challenge-rules';

const FRIENDS_FEED_ACCESS_BLOCK_STORAGE_KEY =
  'sleepy-face:friends-feed-access-block';

export type FriendsFeedAccessState = 'allowed' | 'blocked';

export type FriendsFeedAccessServiceErrorCode =
  'storage_clear_failed' | 'storage_read_failed' | 'storage_write_failed';

export class FriendsFeedAccessServiceError extends Error {
  constructor(
    public readonly code: FriendsFeedAccessServiceErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FriendsFeedAccessServiceError';
  }
}

export async function clearFriendsFeedAccessBlock(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FRIENDS_FEED_ACCESS_BLOCK_STORAGE_KEY);
  } catch (error) {
    throw new FriendsFeedAccessServiceError(
      'storage_clear_failed',
      'Could not clear the Friends Feed Access block.',
      error,
    );
  }
}

// Called by the Challenge Failure screens once the failure outcome is known.
// Persists only the blocked local day; an allowed outcome clears any stale block.
export async function recordFailureAccessOutcome(
  reason: WakeChallengeFailureReason,
  now: Date = new Date(),
): Promise<void> {
  if (getFailureAccessOutcome(reason) === 'allowed') {
    await clearFriendsFeedAccessBlock();
    return;
  }

  try {
    await AsyncStorage.setItem(
      FRIENDS_FEED_ACCESS_BLOCK_STORAGE_KEY,
      getLocalDay(now),
    );
  } catch (error) {
    throw new FriendsFeedAccessServiceError(
      'storage_write_failed',
      'Could not persist the Friends Feed Access block.',
      error,
    );
  }
}

// A block only ever applies to the local day it was recorded on, so a stored
// block from an earlier day reads back as allowed without needing an explicit clear.
export async function getFriendsFeedAccessState(
  now: Date = new Date(),
): Promise<FriendsFeedAccessState> {
  let blockedLocalDay: string | null;

  try {
    blockedLocalDay = await AsyncStorage.getItem(
      FRIENDS_FEED_ACCESS_BLOCK_STORAGE_KEY,
    );
  } catch (error) {
    throw new FriendsFeedAccessServiceError(
      'storage_read_failed',
      'Could not read the Friends Feed Access block.',
      error,
    );
  }

  return blockedLocalDay === getLocalDay(now) ? 'blocked' : 'allowed';
}
