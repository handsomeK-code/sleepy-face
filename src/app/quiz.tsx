import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  ActionButton,
  ChallengeScreen,
  challengeStyles,
} from '@/components/wake-challenge-ui';
import { resumeTimer, useAlarmTimer } from '@/services/alarm-timer';
import {
  QuizServiceError,
  recordQuizFailurePhoto,
  startQuiz,
  submitQuizAnswer,
  type QuizState,
} from '@/services/quiz';
import type { WakeChallengeFailureReason } from '@/services/wake-challenge-rules';

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
  const [message, setMessage] = useState('3問正解すると成功です。');
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

  function handleSubmitAnswer() {
    if (isSubmitting || timer?.status === 'expired') {
      return;
    }

    setIsSubmitting(true);

    try {
      const nextState = submitQuizAnswer(answerText);
      setQuizState(nextState);
      setAnswerText('');

      if (nextState.status === 'completed') {
        router.replace('/quiz-success');
        return;
      }

      setMessage(nextState.lastAnswerCorrect ? '正解です。' : 'もう一問です。');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isActive = quizState.status === 'active';

  return (
    <ChallengeScreen timer={timer}>
      <View style={styles.content}>
        <View style={styles.question}>
          <Text style={styles.progress}>
            {quizState.correctAnswerCount}/
            {quizState.requiredCorrectAnswerCount}
          </Text>
          <Text style={styles.prompt}>
            {isActive ? quizState.question.prompt : 'CLEAR'}
          </Text>
        </View>

        <View style={styles.grid}>
          {Array.from({ length: 9 }, (_, index) => (
            <View key={index} style={styles.gridCell}>
              <Text style={styles.gridText}>{index + 1}</Text>
            </View>
          ))}
          <View style={styles.gridCell}>
            <Text style={styles.gridText}>C</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridText}>0</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridText}>⌫</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={challengeStyles.lightCaption}>
            第{quizState.attemptNumber}問 {message}
          </Text>
          <TextInput
            editable={!isRecordingFailure}
            keyboardType="number-pad"
            onChangeText={setAnswerText}
            placeholder="答え"
            placeholderTextColor="#a3a3a3"
            style={styles.input}
            value={answerText}
          />
          <ActionButton
            disabled={!answerText.trim() || isRecordingFailure}
            label={isRecordingFailure ? '失敗を記録中' : '回答する'}
            loading={isSubmitting || isRecordingFailure}
            onPress={handleSubmitAnswer}
          />
        </View>
      </View>
    </ChallengeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 24,
    paddingBottom: 24,
  },
  form: {
    gap: 12,
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
  gridText: {
    color: '#171717',
    fontSize: 26,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#fafafa',
    borderColor: '#d4d4d4',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    fontSize: 28,
    fontWeight: '800',
    minHeight: 64,
    paddingHorizontal: 18,
    textAlign: 'center',
  },
  progress: {
    color: '#737373',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  prompt: {
    color: '#171717',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    textAlign: 'center',
  },
  question: {
    backgroundColor: '#fafafa',
    borderBottomColor: '#171717',
    borderBottomWidth: 4,
    gap: 16,
    minHeight: 120,
    padding: 18,
  },
});
