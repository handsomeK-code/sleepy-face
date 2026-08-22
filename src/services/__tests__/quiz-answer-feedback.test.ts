import { describe, expect, it, vi } from 'vitest';

import {
  playIncorrectQuizAnswerFeedback,
  replaySoundEffect,
} from '../quiz-answer-feedback';

describe('replaySoundEffect', () => {
  it('waits for the rewind before playing a sound effect', async () => {
    let finishRewind: (() => void) | undefined;
    const seekTo = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRewind = resolve;
        }),
    );
    const play = vi.fn();

    const feedback = replaySoundEffect({ play, seekTo });

    expect(seekTo).toHaveBeenCalledWith(0);
    expect(play).not.toHaveBeenCalled();

    finishRewind?.();
    await feedback;

    expect(play).toHaveBeenCalledOnce();
  });

  it('does not reject when playback fails synchronously', async () => {
    const playbackError = new Error('Audio is unavailable.');

    await expect(
      replaySoundEffect({
        play: () => {
          throw playbackError;
        },
        seekTo: vi.fn().mockResolvedValue(undefined),
      }),
    ).resolves.toBeUndefined();
  });

  it('attempts playback after an asynchronous rewind failure', async () => {
    const rewindError = new Error('Audio is not loaded.');
    const play = vi.fn();

    await replaySoundEffect({
      play,
      seekTo: vi.fn().mockRejectedValue(rewindError),
    });

    expect(play).toHaveBeenCalledOnce();
  });
});

describe('playIncorrectQuizAnswerFeedback', () => {
  it('plays the incorrect sound and triggers an error haptic', async () => {
    const play = vi.fn();
    const seekTo = vi.fn().mockResolvedValue(undefined);
    const notifyError = vi.fn().mockResolvedValue(undefined);

    await playIncorrectQuizAnswerFeedback({ play, seekTo }, notifyError);

    expect(seekTo).toHaveBeenCalledWith(0);
    expect(play).toHaveBeenCalledOnce();
    expect(notifyError).toHaveBeenCalledOnce();
  });

  it('does not reject when haptics fail synchronously', async () => {
    await expect(
      playIncorrectQuizAnswerFeedback(
        {
          play: vi.fn(),
          seekTo: vi.fn().mockResolvedValue(undefined),
        },
        () => {
          throw new Error('Haptics are unavailable.');
        },
      ),
    ).resolves.toBeUndefined();
  });

  it('handles an asynchronous haptic failure', async () => {
    await playIncorrectQuizAnswerFeedback(
      {
        play: vi.fn(),
        seekTo: vi.fn().mockResolvedValue(undefined),
      },
      vi.fn().mockRejectedValue(new Error('Haptics are unavailable.')),
    );
  });
});
