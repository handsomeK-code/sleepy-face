import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  ChallengeScreen,
  challengeStyles,
} from '@/components/wake-challenge-ui';
import {
  getFailureAccessOutcome,
  type WakeChallengeFailureReason,
} from '@/services/wake-challenge-rules';
import { clearWakeChallengeAttempt } from '@/services/wake-challenge-attempt';

type PhotoFailureReason = Extract<
  WakeChallengeFailureReason,
  'quiz-timeout' | 'quiz-upload-failed'
>;

function getPhotoFailureReason(reason?: string): PhotoFailureReason {
  return reason === 'quiz-upload-failed'
    ? 'quiz-upload-failed'
    : 'quiz-timeout';
}

function getPhotoFailureCopy(reason: PhotoFailureReason) {
  switch (reason) {
    case 'quiz-timeout':
      return 'クイズが時間切れになりました。この写真を失敗記録として保存しました。';
    case 'quiz-upload-failed':
      return 'クイズは時間切れです。写真の保存には失敗しましたが、撮影した写真はこちらです。';
  }
}

export default function QuizFailurePhotoScreen() {
  const params = useLocalSearchParams<{
    localPhotoUri?: string;
    reason?: string;
  }>();

  useEffect(() => {
    clearWakeChallengeAttempt().catch(() => {});
  }, []);

  const failureReason = getPhotoFailureReason(params.reason);
  const accessOutcome = getFailureAccessOutcome(failureReason);
  const actionLabel =
    accessOutcome === 'allowed' ? 'フィードへ進む' : 'アラームへ戻る';

  return (
    <ChallengeScreen timer={{ remainingMs: 0, status: 'expired' }}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>×</Text>
        </View>

        <View style={styles.copy}>
          <Text style={challengeStyles.lightTitle}>起床失敗</Text>
          <Text style={challengeStyles.lightCaption}>
            {getPhotoFailureCopy(failureReason)}
          </Text>
        </View>

        {!!params.localPhotoUri && (
          <Image
            resizeMode="cover"
            source={{ uri: params.localPhotoUri }}
            style={styles.photo}
          />
        )}

        <ActionButton
          label={actionLabel}
          onPress={() => router.replace('/home')}
        />
      </View>
    </ChallengeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 32,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  copy: {
    gap: 12,
  },
  icon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  iconText: {
    color: '#171717',
    fontSize: 46,
    fontWeight: '900',
  },
  photo: {
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    height: 200,
    width: 200,
  },
});
