import { router } from 'expo-router';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import {
  pauseTimer,
  resumeTimer,
  startTimer,
  useAlarmTimer,
} from '@/services/alarm-timer';

export default function TimerTestScreen() {
  const timer = useAlarmTimer();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text>タイマーテスト画面</Text>
        <Text>status: {timer?.status ?? 'null'}</Text>
        <Text>remainingMs: {timer?.remainingMs ?? 'null'}</Text>

        <Button onPress={() => startTimer(10)} title="start 10s" />
        <Button onPress={pauseTimer} title="pause" />
        <Button onPress={resumeTimer} title="resume" />
        <Button
          onPress={() => router.navigate('/dev-menu')}
          title="画面一覧に戻る"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
});
