import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  ChallengeScreen,
  challengeStyles,
} from '@/components/wake-challenge-ui';

export default function QuizSuccessScreen() {
  return (
    <ChallengeScreen timer={{ remainingMs: 0, status: 'expired' }}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <View style={styles.copy}>
          <Text style={challengeStyles.lightTitle}>起床成功</Text>
          <Text style={challengeStyles.lightCaption}>
            写真とクイズを完了しました
          </Text>
        </View>

        <ActionButton
          label="ホームへ"
          onPress={() => router.replace('/home')}
        />
      </View>
    </ChallengeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 38,
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
});
