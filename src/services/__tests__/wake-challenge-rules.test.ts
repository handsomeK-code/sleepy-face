import { describe, expect, it } from 'vitest';

import {
  getFailureAccessOutcome,
  getNextBadPhotoAttemptCount,
  shouldRecordQuizFailurePhoto,
} from '../wake-challenge-rules';

describe('Wake Up Challenge rules', () => {
  it('blocks Friends Feed Access for failures without a retained Face Proof photo', () => {
    expect(getFailureAccessOutcome('no-photo-timeout')).toBe('blocked');
    expect(getFailureAccessOutcome('bad-photo-limit')).toBe('blocked');
    expect(getFailureAccessOutcome('quiz-upload-failed')).toBe('blocked');
  });

  it('allows Friends Feed Access for photo-backed Quiz Failure', () => {
    expect(getFailureAccessOutcome('quiz-timeout')).toBe('allowed');
  });

  it('records a quiz-failure photo only for photo-backed Quiz Failure', () => {
    expect(shouldRecordQuizFailurePhoto('quiz-timeout')).toBe(true);
    expect(shouldRecordQuizFailurePhoto('no-photo-timeout')).toBe(false);
    expect(shouldRecordQuizFailurePhoto('bad-photo-limit')).toBe(false);
  });

  it('advances Bad Photo Attempt count without resetting the challenge', () => {
    expect(getNextBadPhotoAttemptCount(0)).toBe(1);
    expect(getNextBadPhotoAttemptCount(2)).toBe(3);
  });
});
