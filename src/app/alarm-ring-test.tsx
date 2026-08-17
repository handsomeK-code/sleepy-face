import { useCallback, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

import {
  AndroidAlarmMechanicsError,
  canScheduleExactAlarms,
  cancelScheduledTestAlarm,
  getNotificationPermissionStatus,
  openExactAlarmSettings,
  requestNotificationPermission,
  scheduleTestAlarm,
  type NotificationPermissionStatus,
  type RingingAlarmSchedule,
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

export default function AlarmRingTestScreen() {
  const [canScheduleExactAlarm, setCanScheduleExactAlarm] = useState<
    boolean | null
  >(null);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationPermissionStatus | null>(null);
  const [schedule, setSchedule] = useState<RingingAlarmSchedule | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [exactAlarmResult, notificationResult] = await Promise.all([
        canScheduleExactAlarms(),
        getNotificationPermissionStatus(),
      ]);

      setCanScheduleExactAlarm(exactAlarmResult);
      setNotificationStatus(notificationResult);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshStatus();
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [refreshStatus]);

  const handleOpenExactAlarmSettings = useCallback(async () => {
    try {
      setErrorMessage(null);
      await openExactAlarmSettings();
      setMessage('opened exact alarm settings');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  const handleRequestNotificationPermission = useCallback(async () => {
    try {
      setErrorMessage(null);
      const nextStatus = await requestNotificationPermission();
      setNotificationStatus(nextStatus);
      setMessage(`notification permission: ${nextStatus}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  const handleSchedule = useCallback(async () => {
    try {
      setErrorMessage(null);
      const nextSchedule = await scheduleTestAlarm();
      setSchedule(nextSchedule);
      setMessage('scheduled test alarm for 20 seconds from now');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  const handleCancel = useCallback(async () => {
    try {
      setErrorMessage(null);
      await cancelScheduledTestAlarm();
      setSchedule(null);
      setMessage('canceled scheduled test alarm');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  return (
    <View>
      <Text>Android Alarm Mechanics Test</Text>
      <Text>exact alarm: {String(canScheduleExactAlarm)}</Text>
      <Text>notification: {notificationStatus ?? 'unknown'}</Text>
      <Button onPress={refreshStatus} title="refresh status" />
      <Button
        onPress={handleOpenExactAlarmSettings}
        title="open exact alarm settings"
      />
      <Button
        onPress={handleRequestNotificationPermission}
        title="request notification permission"
      />
      <Button onPress={handleSchedule} title="set test alarm 20s" />
      <Button onPress={handleCancel} title="cancel scheduled test alarm" />
      <Text>alarmId: {schedule?.alarmId ?? 'none'}</Text>
      <Text>scheduledFor: {schedule?.scheduledFor ?? 'none'}</Text>
      <Text>message: {message ?? 'none'}</Text>
      <Text>error: {errorMessage ?? 'none'}</Text>
    </View>
  );
}
