import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDevMode, setDevMode, toggleDevMode } from '../dev-mode';

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mocks.getItem,
    setItem: mocks.setItem,
  },
}));

describe('Dev Mode service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItem.mockResolvedValue(null);
    mocks.setItem.mockResolvedValue(undefined);
  });

  it('reads disabled when nothing is stored', async () => {
    await expect(getDevMode()).resolves.toBe(false);
  });

  it('reads enabled when the stored flag is true', async () => {
    mocks.getItem.mockResolvedValue('true');

    await expect(getDevMode()).resolves.toBe(true);
  });

  it('reads disabled when the stored flag is false', async () => {
    mocks.getItem.mockResolvedValue('false');

    await expect(getDevMode()).resolves.toBe(false);
  });

  it('persists enabling dev mode', async () => {
    await setDevMode(true);

    expect(mocks.setItem).toHaveBeenCalledWith('sleepy-face:dev-mode', 'true');
  });

  it('persists disabling dev mode', async () => {
    await setDevMode(false);

    expect(mocks.setItem).toHaveBeenCalledWith('sleepy-face:dev-mode', 'false');
  });

  it('toggles from disabled to enabled', async () => {
    mocks.getItem.mockResolvedValue('false');

    await expect(toggleDevMode()).resolves.toBe(true);
    expect(mocks.setItem).toHaveBeenCalledWith('sleepy-face:dev-mode', 'true');
  });

  it('toggles from enabled to disabled', async () => {
    mocks.getItem.mockResolvedValue('true');

    await expect(toggleDevMode()).resolves.toBe(false);
    expect(mocks.setItem).toHaveBeenCalledWith('sleepy-face:dev-mode', 'false');
  });
});
