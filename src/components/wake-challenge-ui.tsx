import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AlarmTimerState } from '@/services/alarm-timer';

export const ALARM_TIMER_SECONDS = 180;
export const MAX_BAD_PHOTO_ATTEMPTS = 3;

export function formatRemainingTime(timer: AlarmTimerState | null): string {
  const remainingMs = timer?.remainingMs ?? ALARM_TIMER_SECONDS * 1000;
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type ChallengeScreenProps = {
  children: ReactNode;
  dark?: boolean;
  timer: AlarmTimerState | null;
};

export function ChallengeScreen({
  children,
  dark = false,
  timer,
}: ChallengeScreenProps) {
  return (
    <View
      style={[styles.screen, dark ? styles.screenDark : styles.screenLight]}
    >
      <View style={styles.phone}>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>ALARM</Text>
        </View>
        <Text
          style={[styles.timer, dark ? styles.timerDark : styles.timerLight]}
        >
          {formatRemainingTime(timer)}
        </Text>
        {children}
      </View>
    </View>
  );
}

type ActionButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function ActionButton({
  disabled,
  label,
  loading,
  onPress,
  variant = 'primary',
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#ffffff' : '#171717'} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export const challengeStyles = StyleSheet.create({
  darkCaption: {
    color: '#a3a3a3',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  darkTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
  },
  lightCaption: {
    color: '#737373',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  lightTitle: {
    color: '#171717',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
  },
  phone: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 42,
  },
  primaryButton: {
    backgroundColor: '#171717',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  screen: {
    flex: 1,
  },
  screenDark: {
    backgroundColor: '#171717',
  },
  screenLight: {
    backgroundColor: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d4d4d4',
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: '#171717',
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(23, 23, 23, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginBottom: 48,
    width: 172,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  timer: {
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 62,
    marginBottom: 38,
    textAlign: 'center',
  },
  timerDark: {
    color: '#ffffff',
  },
  timerLight: {
    color: '#171717',
  },
});
