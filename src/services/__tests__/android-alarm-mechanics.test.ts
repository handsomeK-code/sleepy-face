import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockNativeAndroidAlarmMechanicsModule = {
  canScheduleExactAlarms: ReturnType<typeof vi.fn>;
  cancelScheduledTestAlarm: ReturnType<typeof vi.fn>;
  getNotificationPermissionStatus: ReturnType<typeof vi.fn>;
  getRingingAlarmState: ReturnType<typeof vi.fn>;
  openExactAlarmSettings: ReturnType<typeof vi.fn>;
  requestNotificationPermission: ReturnType<typeof vi.fn>;
  scheduleTestAlarmAfterSeconds: ReturnType<typeof vi.fn>;
  stopRingingAlarm: ReturnType<typeof vi.fn>;
};

const nativeModule: MockNativeAndroidAlarmMechanicsModule = {
  canScheduleExactAlarms: vi.fn(),
  cancelScheduledTestAlarm: vi.fn(),
  getNotificationPermissionStatus: vi.fn(),
  getRingingAlarmState: vi.fn(),
  openExactAlarmSettings: vi.fn(),
  requestNotificationPermission: vi.fn(),
  scheduleTestAlarmAfterSeconds: vi.fn(),
  stopRingingAlarm: vi.fn(),
};

vi.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: vi.fn(() => nativeModule),
}));

describe('Android Alarm Mechanics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks exact alarm access and opens exact alarm settings', async () => {
    const androidAlarmMechanics = await import('../android-alarm-mechanics');

    nativeModule.canScheduleExactAlarms.mockResolvedValue(true);
    await expect(androidAlarmMechanics.canScheduleExactAlarms()).resolves.toBe(
      true,
    );
    expect(nativeModule.canScheduleExactAlarms).toHaveBeenCalledTimes(1);

    nativeModule.openExactAlarmSettings.mockResolvedValue(undefined);
    await expect(
      androidAlarmMechanics.openExactAlarmSettings(),
    ).resolves.toBeUndefined();
    expect(nativeModule.openExactAlarmSettings).toHaveBeenCalledTimes(1);
  });

  it('checks and requests notification permission status', async () => {
    const androidAlarmMechanics = await import('../android-alarm-mechanics');

    nativeModule.getNotificationPermissionStatus.mockResolvedValue('denied');
    await expect(
      androidAlarmMechanics.getNotificationPermissionStatus(),
    ).resolves.toBe('denied');

    nativeModule.requestNotificationPermission.mockResolvedValue('granted');
    await expect(
      androidAlarmMechanics.requestNotificationPermission(),
    ).resolves.toBe('granted');
  });

  it('schedules a test alarm for 20 seconds and returns the schedule result', async () => {
    const androidAlarmMechanics = await import('../android-alarm-mechanics');
    const schedule = {
      alarmId: 'test-alarm-1',
      scheduledFor: '2026-08-17T00:00:20.000Z',
    };

    nativeModule.scheduleTestAlarmAfterSeconds.mockResolvedValue(schedule);

    await expect(androidAlarmMechanics.scheduleTestAlarm()).resolves.toEqual(
      schedule,
    );
    expect(nativeModule.scheduleTestAlarmAfterSeconds).toHaveBeenCalledWith(20);
  });

  it('maps native already-ringing errors to typed service errors', async () => {
    const androidAlarmMechanics = await import('../android-alarm-mechanics');

    nativeModule.scheduleTestAlarmAfterSeconds.mockRejectedValue(
      Object.assign(new Error('Already ringing'), {
        code: 'already_ringing',
      }),
    );

    await expect(
      androidAlarmMechanics.scheduleTestAlarm(),
    ).rejects.toMatchObject({
      code: 'already_ringing',
      name: 'AndroidAlarmMechanicsError',
    });
  });

  it('maps native exact-alarm errors to typed service errors', async () => {
    const androidAlarmMechanics = await import('../android-alarm-mechanics');

    nativeModule.scheduleTestAlarmAfterSeconds.mockRejectedValue(
      Object.assign(new Error('Exact alarm unavailable'), {
        code: 'exact_alarm_unavailable',
      }),
    );

    await expect(
      androidAlarmMechanics.scheduleTestAlarm(),
    ).rejects.toMatchObject({
      code: 'exact_alarm_unavailable',
    });
  });

  it('exposes cancel, ringing state, and stop as native calls', async () => {
    const androidAlarmMechanics = await import('../android-alarm-mechanics');
    const ringingState = {
      alarmId: 'test-alarm-1',
      startedAt: '2026-08-17T00:00:20.000Z',
    };

    nativeModule.cancelScheduledTestAlarm.mockResolvedValue(undefined);
    await expect(
      androidAlarmMechanics.cancelScheduledTestAlarm(),
    ).resolves.toBeUndefined();

    nativeModule.getRingingAlarmState.mockResolvedValue(ringingState);
    await expect(androidAlarmMechanics.getRingingAlarmState()).resolves.toEqual(
      ringingState,
    );

    nativeModule.stopRingingAlarm.mockResolvedValue(undefined);
    await expect(
      androidAlarmMechanics.stopRingingAlarm(),
    ).resolves.toBeUndefined();
  });
});
