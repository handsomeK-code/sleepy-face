import { requireOptionalNativeModule } from 'expo-modules-core';

export type AndroidAlarmMechanicsErrorCode =
  | 'already_ringing'
  | 'exact_alarm_unavailable'
  | 'native_alarm_error'
  | 'notification_permission_denied'
  | 'unsupported_platform';

export type NotificationPermissionStatus =
  'denied' | 'granted' | 'undetermined';

export type RingingAlarmSchedule = {
  alarmId: string;
  scheduledFor: string;
};

export type RingingAlarmState = {
  alarmId: string;
  startedAt: string;
};

type NativeAndroidAlarmMechanicsModule = {
  canScheduleExactAlarms(): Promise<boolean>;
  cancelScheduledTestAlarm(): Promise<void>;
  getNotificationPermissionStatus(): Promise<NotificationPermissionStatus>;
  getRingingAlarmState(): Promise<RingingAlarmState | null>;
  openExactAlarmSettings(): Promise<void>;
  requestNotificationPermission(): Promise<NotificationPermissionStatus>;
  scheduleTestAlarmAfterSeconds(seconds: number): Promise<RingingAlarmSchedule>;
  stopRingingAlarm(): Promise<void>;
};

const TEST_ALARM_DELAY_SECONDS = 20;

const nativeModule =
  requireOptionalNativeModule<NativeAndroidAlarmMechanicsModule>(
    'AndroidAlarmMechanics',
  );

export class AndroidAlarmMechanicsError extends Error {
  constructor(
    public readonly code: AndroidAlarmMechanicsErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AndroidAlarmMechanicsError';
  }
}

function getNativeModule(): NativeAndroidAlarmMechanicsModule {
  if (!nativeModule) {
    throw new AndroidAlarmMechanicsError(
      'unsupported_platform',
      'Android Alarm Mechanics are only available in the native Android app.',
    );
  }

  return nativeModule;
}

function isKnownErrorCode(
  code: unknown,
): code is AndroidAlarmMechanicsErrorCode {
  return (
    code === 'already_ringing' ||
    code === 'exact_alarm_unavailable' ||
    code === 'native_alarm_error' ||
    code === 'notification_permission_denied' ||
    code === 'unsupported_platform'
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Android Alarm Mechanics failed.';
}

function toAndroidAlarmMechanicsError(
  error: unknown,
): AndroidAlarmMechanicsError {
  if (error instanceof AndroidAlarmMechanicsError) {
    return error;
  }

  const maybeCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;

  return new AndroidAlarmMechanicsError(
    isKnownErrorCode(maybeCode) ? maybeCode : 'native_alarm_error',
    getErrorMessage(error),
    error,
  );
}

async function callNative<T>(
  operation: (module: NativeAndroidAlarmMechanicsModule) => Promise<T>,
): Promise<T> {
  try {
    return await operation(getNativeModule());
  } catch (error) {
    throw toAndroidAlarmMechanicsError(error);
  }
}

export function canScheduleExactAlarms(): Promise<boolean> {
  return callNative((module) => module.canScheduleExactAlarms());
}

export function openExactAlarmSettings(): Promise<void> {
  return callNative((module) => module.openExactAlarmSettings());
}

export function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  return callNative((module) => module.getNotificationPermissionStatus());
}

export function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  return callNative((module) => module.requestNotificationPermission());
}

export function scheduleTestAlarm(): Promise<RingingAlarmSchedule> {
  return callNative((module) =>
    module.scheduleTestAlarmAfterSeconds(TEST_ALARM_DELAY_SECONDS),
  );
}

export function cancelScheduledTestAlarm(): Promise<void> {
  return callNative((module) => module.cancelScheduledTestAlarm());
}

export function getRingingAlarmState(): Promise<RingingAlarmState | null> {
  return callNative((module) => module.getRingingAlarmState());
}

export function stopRingingAlarm(): Promise<void> {
  return callNative((module) => module.stopRingingAlarm());
}
