import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  ChallengeScreen,
  challengeStyles,
} from '@/components/wake-challenge-ui';
import {
  getFailureAccessOutcome,
  type WakeChallengeFailureReason,
} from '@/services/wake-challenge-rules';

function getFailureReason(reason?: string): WakeChallengeFailureReason {
  switch (reason) {
    case 'bad-photo-limit':
    case 'no-photo-timeout':
    case 'quiz-timeout':
    case 'quiz-upload-failed':
      return reason;
    default:
      return 'no-photo-timeout';
  }
}

function getFailureCopy(reason: WakeChallengeFailureReason) {
  switch (reason) {
    case 'bad-photo-limit':
      return '顔写真を確認できなかったため、今日はフィードを見られません。';
    case 'no-photo-timeout':
      return '写真を残せないまま時間切れになりました。今日はフィードを見られません。';
    case 'quiz-timeout':
      return 'クイズが時間切れになりました。写真を失敗記録として保存しました。';
    case 'quiz-upload-failed':
      return 'クイズは時間切れです。写真の保存に失敗しました。';
  }
}

export default function QuizFailureScreen() {
  const params = useLocalSearchParams<{
    reason?: string;
    storagePath?: string;
  }>();

  const failureReason = getFailureReason(params.reason);
  const accessOutcome = getFailureAccessOutcome(failureReason);
  const actionLabel =
    accessOutcome === 'allowed' ? 'フィードへ進む' : 'アラームへ戻る';

  return (
    <ChallengeScreen dark timer={{ remainingMs: 0, status: 'expired' }}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>×</Text>
        </View>

        <View style={styles.copy}>
          <Text style={challengeStyles.darkTitle}>起床失敗</Text>
          <Text style={challengeStyles.darkCaption}>
            {getFailureCopy(failureReason)}
          </Text>
          {!!params.storagePath && <Text style={styles.storage}>保存済み</Text>}
        </View>

        <ActionButton
          label={actionLabel}
          onPress={() => router.replace('/home')}
          variant="secondary"
        />
      </View>
    </ChallengeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 38,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  copy: {
    gap: 12,
  },
  icon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 48,
    borderWidth: 4,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  iconText: {
    color: '#ffffff',
    fontSize: 46,
    fontWeight: '900',
  },
  storage: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
