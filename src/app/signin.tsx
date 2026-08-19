import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import {
  GoogleLoginError,
  coolDownGoogleLogin,
  startGoogleLogin,
  warmUpGoogleLogin,
} from '@/services/auth';
import { getMyProfile } from '@/services/user';

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof GoogleLoginError) {
    switch (error.code) {
      case 'login_interrupted':
        return 'Googleログインが中断されました。もう一度お試しください。';
      case 'oauth_url_missing':
      case 'provider_error':
        return 'Googleログインを開始できませんでした。設定を確認してください。';
      case 'missing_auth_tokens':
      case 'session_set_failed':
      case 'unexpected_error':
        return 'ログインに失敗しました。時間をおいてもう一度お試しください。';
    }
  }

  return 'ログインに失敗しました。時間をおいてもう一度お試しください。';
}

export default function SigninScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    warmUpGoogleLogin().catch(() => undefined);

    return () => {
      coolDownGoogleLogin().catch(() => undefined);
    };
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await startGoogleLogin();
      const profile = await getMyProfile();

      if (profile) {
        router.replace('/home');
      } else {
        router.replace('/profile-setup');
      }
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.wordmarkArea}>
          <Text style={styles.wordmark}>SLEEPY FACE</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>ログイン</Text>
          <Text style={styles.description}>
            Googleアカウントでログインしてください。
          </Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={handleGoogleLogin}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.googleButtonText}>
              {isLoading ? 'ログイン中...' : 'Googleでログイン'}
            </Text>
          </Pressable>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  wordmarkArea: {
    alignItems: 'center',
  },
  wordmark: {
    color: '#171717',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    color: '#171717',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    color: '#737373',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  footer: {
    gap: 16,
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderColor: '#e5e5e5',
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    color: '#171717',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
