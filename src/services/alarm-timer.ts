import { useSyncExternalStore } from 'react';

export type AlarmTimerState = {
  remainingMs: number;
  status: 'running' | 'paused' | 'expired';
};

type InternalAlarmTimerState =
  | {
      expiresAt: number;
      status: 'running';
    }
  | {
      remainingMs: number;
      status: 'paused';
    }
  | {
      remainingMs: 0;
      status: 'expired';
    };

type AlarmTimerListener = () => void;

const TICK_INTERVAL_MS = 100;

let timerState: InternalAlarmTimerState | null = null;
let listenerInterval: ReturnType<typeof setInterval> | null = null;
let lastPublicState: AlarmTimerState | null = null;
let lastPublicStateKey = 'null';
const listeners = new Set<AlarmTimerListener>();

function cachePublicState(
  state: AlarmTimerState | null,
): AlarmTimerState | null {
  const stateKey = state ? `${state.status}:${state.remainingMs}` : 'null';

  if (stateKey === lastPublicStateKey) {
    return lastPublicState;
  }

  lastPublicState = state;
  lastPublicStateKey = stateKey;

  return state;
}

function runningStateToPublicState(
  state: Extract<InternalAlarmTimerState, { status: 'running' }>,
): AlarmTimerState {
  const remainingMs = state.expiresAt - Date.now();

  if (remainingMs <= 0) {
    timerState = {
      remainingMs: 0,
      status: 'expired',
    };

    return timerState;
  }

  return {
    remainingMs,
    status: 'running',
  };
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function startListenerInterval() {
  if (listenerInterval) {
    return;
  }

  listenerInterval = setInterval(() => {
    getAlarmTimerState();
    notifyListeners();
  }, TICK_INTERVAL_MS);
}

function stopListenerInterval() {
  if (!listenerInterval || listeners.size > 0) {
    return;
  }

  clearInterval(listenerInterval);
  listenerInterval = null;
}

export function getAlarmTimerState(): AlarmTimerState | null {
  if (!timerState) {
    return cachePublicState(null);
  }

  let publicState: AlarmTimerState;

  if (timerState.status === 'running') {
    publicState = runningStateToPublicState(timerState);
  } else {
    publicState = timerState;
  }

  return cachePublicState(publicState);
}

export function startTimer(durationSeconds: number): void {
  const durationMs = durationSeconds * 1000;

  timerState =
    durationMs <= 0
      ? {
          remainingMs: 0,
          status: 'expired',
        }
      : {
          expiresAt: Date.now() + durationMs,
          status: 'running',
        };

  notifyListeners();
}

export function pauseTimer(): void {
  const currentState = getAlarmTimerState();

  if (!currentState || currentState.status !== 'running') {
    return;
  }

  timerState = {
    remainingMs: currentState.remainingMs,
    status: 'paused',
  };

  notifyListeners();
}

export function resumeTimer(): void {
  const currentState = getAlarmTimerState();

  if (!currentState || currentState.status !== 'paused') {
    return;
  }

  timerState =
    currentState.remainingMs <= 0
      ? {
          remainingMs: 0,
          status: 'expired',
        }
      : {
          expiresAt: Date.now() + currentState.remainingMs,
          status: 'running',
        };

  notifyListeners();
}

export function subscribeToAlarmTimer(
  listener: AlarmTimerListener,
): () => void {
  listeners.add(listener);
  startListenerInterval();

  return () => {
    listeners.delete(listener);
    stopListenerInterval();
  };
}

export function useAlarmTimer(): AlarmTimerState | null {
  return useSyncExternalStore(
    subscribeToAlarmTimer,
    getAlarmTimerState,
    getAlarmTimerState,
  );
}
