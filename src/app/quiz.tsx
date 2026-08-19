import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  formatRemainingTime,
} from '@/components/wake-challenge-ui';
import { resumeTimer, useAlarmTimer } from '@/services/alarm-timer';
import {
  QuizServiceError,
  recordQuizFailurePhoto,
  startQuiz,
  submitQuizAnswer,
  type QuizState,
} from '@/services/quiz';
import {
  applyQuizKeypadInput,
  type QuizKeypadKey,
} from '@/services/quiz-keypad';
import type { WakeChallengeFailureReason } from '@/services/wake-challenge-rules';

const KEYPAD_KEYS: QuizKeypadKey[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'clear',
  '0',
  'backspace',
];

function getKeypadKeyLabel(key: QuizKeypadKey): string {
  if (key === 'clear') {
    return 'C';
  }

  if (key === 'backspace') {
    return '⌫';
  }

  return key;
}

function getErrorMessage(error: unknown) {
  if (error instanceof QuizServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'クイズの処理に失敗しました。';
}

export default function QuizScreen() {
  const params = useLocalSearchParams<{
    localPhotoUri?: string;
  }>();
  const timer = useAlarmTimer();
  const [quizState, setQuizState] = useState<QuizState>(() => startQuiz());
  const [answerText, setAnswerText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordingFailure, setIsRecordingFailure] = useState(false);
  const didHandleExpiry = useRef(false);

  useEffect(() => {
    resumeTimer();
  }, []);

  const routeToFailure = useCallback((reason: WakeChallengeFailureReason) => {
    router.replace({
      pathname: '/quiz-failure',
      params: { reason },
    });
  }, []);

  const routeToPhotoFailure = useCallback(
    (
      reason: Extract<
        WakeChallengeFailureReason,
        'quiz-timeout' | 'quiz-upload-failed'
      >,
      localPhotoUri: string,
    ) => {
      router.replace({
        pathname: '/quiz-failure-photo',
        params: { localPhotoUri, reason },
      });
    },
    [],
  );

  useEffect(() => {
    if (timer?.status !== 'expired' || didHandleExpiry.current) {
      return;
    }

    didHandleExpiry.current = true;

    async function handleQuizTimeout() {
      if (!params.localPhotoUri) {
        routeToFailure('no-photo-timeout');
        return;
      }

      setIsRecordingFailure(true);

      try {
        await recordQuizFailurePhoto(params.localPhotoUri);
        routeToPhotoFailure('quiz-timeout', params.localPhotoUri);
      } catch {
        routeToPhotoFailure('quiz-upload-failed', params.localPhotoUri);
      }
    }

    handleQuizTimeout();
  }, [
    params.localPhotoUri,
    routeToFailure,
    routeToPhotoFailure,
    timer?.status,
  ]);

  function handleKeypadPress(key: QuizKeypadKey) {
    if (isRecordingFailure) {
      return;
    }

    setErrorMessage(null);
    setAnswerText((current) => applyQuizKeypadInput(current, key));
  }

  function handleSubmitAnswer() {
    if (isSubmitting || timer?.status === 'expired') {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const nextState = submitQuizAnswer(answerText);
      setQuizState(nextState);
      setAnswerText('');

      if (nextState.status === 'completed') {
        router.replace('/quiz-success');
        return;
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isActive = quizState.status === 'active';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.timerPill}>
          <Text style={styles.timerPillText}>
            あと {formatRemainingTime(timer)}
          </Text>
        </View>

        <Text style={styles.progress}>
          {quizState.correctAnswerCount}/{quizState.requiredCorrectAnswerCount}
        </Text>

        {quizState.lastAnswerCorrect !== null && (
          <Text
            style={
              quizState.lastAnswerCorrect
                ? styles.correctCue
                : styles.incorrectCue
            }
          >
            {quizState.lastAnswerCorrect ? '正解!' : '不正解'}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.prompt}>
          {isActive ? quizState.question.prompt : 'CLEAR'}
        </Text>
        <Text style={styles.attemptNumber}>第{quizState.attemptNumber}問</Text>

        <View style={styles.input}>
          <Text style={answerText ? styles.inputText : styles.inputPlaceholder}>
            {answerText || '答え'}
          </Text>
        </View>

        <View style={styles.grid}>
          {KEYPAD_KEYS.map((key) => (
            <Pressable
              accessibilityRole="button"
              disabled={isRecordingFailure}
              key={key}
              onPress={() => handleKeypadPress(key)}
              style={({ pressed }) => [
                styles.gridCell,
                pressed && styles.gridCellPressed,
              ]}
            >
              <Text style={styles.gridText}>{getKeypadKeyLabel(key)}</Text>
            </Pressable>
          ))}
        </View>

        <ActionButton
          disabled={!answerText.trim() || isRecordingFailure}
          label={isRecordingFailure ? '失敗を記録中' : '回答する'}
          loading={isSubmitting || isRecordingFailure}
          onPress={handleSubmitAnswer}
        />

        {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  attemptNumber: {
    color: '#737373',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  correctCue: {
    color: '#16a34a',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  grid: {
    borderColor: '#f5f5f5',
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    alignItems: 'center',
    borderColor: '#f5f5f5',
    borderRightWidth: 1,
    borderTopWidth: 1,
    height: 80,
    justifyContent: 'center',
    width: '33.3333%',
  },
  gridCellPressed: {
    backgroundColor: '#f5f5f5',
  },
  gridText: {
    color: '#171717',
    fontSize: 26,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  incorrectCue: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderColor: '#d4d4d4',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: 18,
  },
  inputPlaceholder: {
    color: '#a3a3a3',
    fontSize: 28,
    fontWeight: '800',
  },
  inputText: {
    color: '#171717',
    fontSize: 28,
    fontWeight: '800',
  },
  progress: {
    color: '#737373',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  prompt: {
    color: '#171717',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    textAlign: 'center',
  },
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  timerPill: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderColor: '#e5e5e5',
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  timerPillText: {
    color: '#171717',
    fontSize: 17,
    fontWeight: '800',
  },
});
