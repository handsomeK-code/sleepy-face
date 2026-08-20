import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_MODE_STORAGE_KEY = 'sleepy-face:dev-mode';

export async function getDevMode(): Promise<boolean> {
  const storedValue = await AsyncStorage.getItem(DEV_MODE_STORAGE_KEY);

  return storedValue === 'true';
}

export async function setDevMode(isEnabled: boolean): Promise<void> {
  await AsyncStorage.setItem(DEV_MODE_STORAGE_KEY, String(isEnabled));
}

export async function toggleDevMode(): Promise<boolean> {
  const nextValue = !(await getDevMode());

  await setDevMode(nextValue);

  return nextValue;
}
