import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

import {
  AndroidAlarmMechanicsError,
  getRingingAlarmState,
  stopRingingAlarm,
  type RingingAlarmState,
} from '@/services/android-alarm-mechanics';

function getErrorMessage(error: unknown): string {
  if (error instanceof AndroidAlarmMechanicsError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'unknown error';
}

export default function RingingScreen() {
  const params = useLocalSearchParams<{
    alarmId?: string;
    startedAt?: string;
  }>();
  const [ringingState, setRingingState] = useState<RingingAlarmState | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshRingingState = useCallback(async () => {
    try {
      setErrorMessage(null);
      setRingingState(await getRingingAlarmState());
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshRingingState();
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [refreshRingingState]);

  const handleStop = useCallback(async () => {
    try {
      setErrorMessage(null);
      await stopRingingAlarm();
      setMessage('stopped ringing alarm');
      await refreshRingingState();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, [refreshRingingState]);

  return (
    <View>
      <Text>アラーム鳴動画面</Text>
      <Text>route alarmId: {params.alarmId ?? 'none'}</Text>
      <Text>route startedAt: {params.startedAt ?? 'none'}</Text>
      <Text>ringing alarmId: {ringingState?.alarmId ?? 'none'}</Text>
      <Text>ringing startedAt: {ringingState?.startedAt ?? 'none'}</Text>
      <Button onPress={refreshRingingState} title="refresh ringing state" />
      <Button onPress={handleStop} title="stop ringing alarm" />
      <Text>message: {message ?? 'none'}</Text>
      <Text>error: {errorMessage ?? 'none'}</Text>
    </View>
  );
}
