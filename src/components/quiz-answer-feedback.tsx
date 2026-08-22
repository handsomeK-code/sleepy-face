import { preload, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import {
  playIncorrectQuizAnswerFeedback,
  replaySoundEffect,
} from '@/services/quiz-answer-feedback';

const correctAnswerSound = require('../../assets/sounds/quiz-correct.wav');
const incorrectAnswerSound = require('../../assets/sounds/quiz-incorrect.mp3');
const soundEffectPlayerOptions = {
  downloadFirst: true,
  keepAudioSessionActive: true,
} as const;

function preloadSoundEffect(source: number): void {
  try {
    void preload(source).catch(() => {});
  } catch {
    // The player will retry loading the bundled asset when it mounts.
  }
}

preloadSoundEffect(correctAnswerSound);
preloadSoundEffect(incorrectAnswerSound);

type QuizAnswerFeedbackContextValue = {
  playCorrectAnswerFeedback: () => void;
  playIncorrectAnswerFeedback: () => void;
};

const QuizAnswerFeedbackContext =
  createContext<QuizAnswerFeedbackContextValue | null>(null);

export function QuizAnswerFeedbackProvider({ children }: PropsWithChildren) {
  const correctAnswerPlayer = useAudioPlayer(
    correctAnswerSound,
    soundEffectPlayerOptions,
  );
  const incorrectAnswerPlayer = useAudioPlayer(
    incorrectAnswerSound,
    soundEffectPlayerOptions,
  );

  useEffect(() => {
    void setAudioModeAsync({
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  const playCorrectAnswerFeedback = useCallback(() => {
    void replaySoundEffect(correctAnswerPlayer);
  }, [correctAnswerPlayer]);

  const playIncorrectAnswerFeedback = useCallback(() => {
    void playIncorrectQuizAnswerFeedback(incorrectAnswerPlayer, () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    );
  }, [incorrectAnswerPlayer]);

  const value = useMemo(
    () => ({ playCorrectAnswerFeedback, playIncorrectAnswerFeedback }),
    [playCorrectAnswerFeedback, playIncorrectAnswerFeedback],
  );

  return (
    <QuizAnswerFeedbackContext.Provider value={value}>
      {children}
    </QuizAnswerFeedbackContext.Provider>
  );
}

export function useQuizAnswerFeedback(): QuizAnswerFeedbackContextValue {
  const context = useContext(QuizAnswerFeedbackContext);

  if (!context) {
    throw new Error(
      'useQuizAnswerFeedback must be used within QuizAnswerFeedbackProvider.',
    );
  }

  return context;
}
