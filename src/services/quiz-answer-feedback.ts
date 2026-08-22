export type SoundEffectPlayer = {
  play: () => void;
  seekTo: (seconds: number) => Promise<void>;
};

export type ErrorHapticNotifier = () => Promise<void>;

export async function replaySoundEffect(
  player: SoundEffectPlayer,
): Promise<void> {
  try {
    await player.seekTo(0);
  } catch {
    // Playback should still be attempted if rewinding is temporarily unavailable.
  }

  try {
    player.play();
  } catch {
    // Feedback is best-effort and must never interrupt quiz progress.
  }
}

export async function playIncorrectQuizAnswerFeedback(
  player: SoundEffectPlayer,
  notifyError: ErrorHapticNotifier,
): Promise<void> {
  const soundFeedback = replaySoundEffect(player);
  let hapticFeedback = Promise.resolve();

  try {
    hapticFeedback = notifyError().catch(() => {});
  } catch {
    // Haptics are best-effort and must never interrupt quiz progress.
  }

  await Promise.all([soundFeedback, hapticFeedback]);
}
