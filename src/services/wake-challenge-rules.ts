export type WakeChallengeFailureReason =
  | 'bad-photo-limit'
  | 'no-photo-timeout'
  | 'quiz-timeout'
  | 'quiz-upload-failed';

export type FriendsFeedAccessOutcome = 'allowed' | 'blocked';

export function getFailureAccessOutcome(
  reason: WakeChallengeFailureReason,
): FriendsFeedAccessOutcome {
  return reason === 'quiz-timeout' ? 'allowed' : 'blocked';
}

export function shouldRecordQuizFailurePhoto(
  reason: WakeChallengeFailureReason,
): boolean {
  return reason === 'quiz-timeout';
}

export function getNextBadPhotoAttemptCount(currentAttemptCount: number) {
  return Math.max(0, currentAttemptCount) + 1;
}
