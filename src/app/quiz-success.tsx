import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton, challengeStyles } from '@/components/wake-challenge-ui';
import { clearWakeChallengeAttempt } from '@/services/wake-challenge-attempt';

export default function QuizSuccessScreen() {
  useEffect(() => {
    clearWakeChallengeAttempt().catch(() => {});
  }, []);

  return (
    <View style={styles.screen}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 38,
    paddingBottom: 48,
  },
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 42,
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
