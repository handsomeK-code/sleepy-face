import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AlarmTimerState } from '../alarm-timer';

type AlarmTimerModule = {
  getAlarmTimerState: () => AlarmTimerState | null;
  getAlarmTimerSnapshot: () => AlarmTimerState | null;
  pauseTimer: () => void;
  resumeTimer: () => void;
  startTimer: (durationSeconds: number) => void;
  subscribeToAlarmTimer: (listener: () => void) => () => void;
};

let alarmTimer: AlarmTimerModule;

describe('Alarm Timer service', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T00:00:00.000Z'));
    alarmTimer = await import('../alarm-timer');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a running Alarm Timer from a duration in seconds', () => {
    alarmTimer.startTimer(10);

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 10_000,
      status: 'running',
    });
  });

  it('exposes null when no timer exists', () => {
    expect(alarmTimer.getAlarmTimerState()).toBeNull();
  });

  it('expires a running Alarm Timer when remaining time reaches zero', () => {
    alarmTimer.startTimer(10);

    vi.advanceTimersByTime(10_000);

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 0,
      status: 'expired',
    });
  });

  it('pauses with the exact remaining milliseconds', () => {
    alarmTimer.startTimer(10);
    vi.advanceTimersByTime(3_250);

    alarmTimer.pauseTimer();

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 6_750,
      status: 'paused',
    });
  });

  it('keeps paused time frozen until resumed', () => {
    alarmTimer.startTimer(10);
    vi.advanceTimersByTime(3_000);
    alarmTimer.pauseTimer();

    vi.advanceTimersByTime(5_000);

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 7_000,
      status: 'paused',
    });

    alarmTimer.resumeTimer();
    vi.advanceTimersByTime(2_500);

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 4_500,
      status: 'running',
    });
  });

  it('restarts and replaces any active timer', () => {
    alarmTimer.startTimer(10);
    vi.advanceTimersByTime(4_000);

    alarmTimer.startTimer(3);

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 3_000,
      status: 'running',
    });
  });

  it('treats non-applicable pause and resume calls as no-ops', () => {
    alarmTimer.pauseTimer();
    alarmTimer.resumeTimer();

    expect(alarmTimer.getAlarmTimerState()).toBeNull();

    alarmTimer.startTimer(10);
    alarmTimer.resumeTimer();

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 10_000,
      status: 'running',
    });

    alarmTimer.pauseTimer();
    alarmTimer.pauseTimer();

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 10_000,
      status: 'paused',
    });

    alarmTimer.startTimer(1);
    vi.advanceTimersByTime(1_000);
    alarmTimer.pauseTimer();
    alarmTimer.resumeTimer();

    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 0,
      status: 'expired',
    });
  });

  it('notifies subscribers on the 100ms timer cadence', () => {
    const listener = vi.fn();
    const unsubscribe = alarmTimer.subscribeToAlarmTimer(listener);

    alarmTimer.startTimer(10);
    vi.advanceTimersByTime(99);

    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(alarmTimer.getAlarmTimerState()).toEqual({
      remainingMs: 9_900,
      status: 'running',
    });

    unsubscribe();
  });

  it('keeps hook snapshots stable between timer notifications', () => {
    alarmTimer.startTimer(10);
    const firstSnapshot = alarmTimer.getAlarmTimerSnapshot();

    vi.advanceTimersByTime(50);

    expect(alarmTimer.getAlarmTimerSnapshot()).toBe(firstSnapshot);

    vi.advanceTimersByTime(50);
    alarmTimer.getAlarmTimerState();

    expect(alarmTimer.getAlarmTimerSnapshot()).not.toBe(firstSnapshot);
  });
});
