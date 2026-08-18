import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  ALARM_TIMER_SECONDS,
  ChallengeScreen,
  challengeStyles,
} from '@/components/wake-challenge-ui';
import {
  AndroidAlarmMechanicsError,
  getRingingAlarmState,
  stopRingingAlarm,
  type RingingAlarmState,
} from '@/services/android-alarm-mechanics';
import {
  getAlarmTimerState,
  startTimerFromStartedAt,
  useAlarmTimer,
} from '@/services/alarm-timer';

function getErrorMessage(error: unknown): string {
  if (error instanceof AndroidAlarmMechanicsError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'アラームの確認に失敗しました。';
}

function getStartedAt(
  ringingState: RingingAlarmState | null,
  routeStartedAt?: string,
) {
  return ringingState?.startedAt ?? routeStartedAt ?? new Date().toISOString();
}

function shouldStartRingingTimer() {
  const currentTimer = getAlarmTimerState();

  return !currentTimer || currentTimer.status === 'expired';
}

function startRingingTimerIfNeeded(startedAt: string) {
  if (!shouldStartRingingTimer()) {
    return;
  }

  startTimerFromStartedAt(ALARM_TIMER_SECONDS, startedAt);
}

export default function RingingScreen() {
  const params = useLocalSearchParams<{
    alarmId?: string;
    startedAt?: string;
  }>();
  const timer = useAlarmTimer();
  const [ringingState, setRingingState] = useState<RingingAlarmState | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const timeout = setTimeout(() => {
      async function refreshRingingState() {
        try {
          if (isActive) {
            setErrorMessage(null);
          }

          const nextRingingState = await getRingingAlarmState();

          if (!isActive) {
            return;
          }

          setRingingState(nextRingingState);

          startRingingTimerIfNeeded(
            getStartedAt(nextRingingState, params.startedAt),
          );
        } catch (error) {
          if (!isActive) {
            return;
          }

          setErrorMessage(getErrorMessage(error));

          startRingingTimerIfNeeded(
            params.startedAt ?? new Date().toISOString(),
          );
        }
      }

      refreshRingingState();
    }, 0);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [params.startedAt]);

  useEffect(() => {
    if (timer?.status === 'expired') {
      router.replace({
        pathname: '/quiz-failure',
        params: { reason: 'no-photo-timeout' },
      });
    }
  }, [timer?.status]);

  async function handleStartChallenge() {
    setIsStarting(true);

    try {
      setErrorMessage(null);
      await stopRingingAlarm();
      router.replace({
        pathname: '/face-check',
        params: {
          alarmId: ringingState?.alarmId ?? params.alarmId ?? '',
          badPhotoAttempts: '0',
        },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <ChallengeScreen dark timer={timer}>
      <View style={styles.content}>
        <View style={styles.ring}>
          <View style={styles.ringInner}>
            <Text style={styles.cameraIcon}>□</Text>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={challengeStyles.darkTitle}>起きる時間です</Text>
          <Text style={challengeStyles.darkCaption}>
            写真とクイズで起床を証明してください
          </Text>
        </View>

        <ActionButton
          label="起床チャレンジを開始"
          loading={isStarting}
          onPress={handleStartChallenge}
          variant="secondary"
        />

        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      </View>
    </ChallengeScreen>
  );
}

const styles = StyleSheet.create({
  cameraIcon: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 64,
  },
  copy: {
    gap: 12,
  },
  error: {
    color: '#fecaca',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  ring: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 48,
    borderWidth: 4,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  ringInner: {
    alignItems: 'center',
    borderColor: '#ffffff',
    borderRadius: 31,
    borderWidth: 2,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
});
