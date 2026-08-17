import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getCurrentUserId } from '@/services/auth';
import {
  UserServiceError,
  createProfile,
  getMyProfile,
  normalizePublicUserId,
  validateInitialSetupInput,
  type InitialSetupValidationErrorCode,
} from '@/services/user';

function getValidationMessage(code: InitialSetupValidationErrorCode): string {
  switch (code) {
    case 'public_user_id_invalid':
      return 'ユーザーIDは3〜20文字の英数字、_、-で入力してください。';
    case 'display_name_required':
      return '表示名を入力してください。';
    case 'display_name_too_long':
      return '表示名は30文字以内で入力してください。';
  }
}

function getCreateProfileErrorMessage(error: unknown): string {
  if (error instanceof UserServiceError) {
    switch (error.code) {
      case 'user_id_already_taken':
        return 'このユーザーIDはすでに使われています。別のIDを入力してください。';
      case 'invalid_profile_input':
        return '入力内容を確認してください。';
      case 'not_authenticated':
      case 'profile_already_created':
      case 'unexpected_error':
        return 'プロフィールを作成できませんでした。もう一度お試しください。';
    }
  }

  return 'プロフィールを作成できませんでした。もう一度お試しください。';
}

export default function ProfileSetupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [publicUserId, setPublicUserId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function protectSetupRoute() {
      const authUserId = await getCurrentUserId();

      if (!isActive) {
        return;
      }

      if (!authUserId) {
        router.replace('/signin');
        return;
      }

      const profile = await getMyProfile();

      if (!isActive) {
        return;
      }

      if (profile) {
        router.replace('/home');
        return;
      }

      setIsCheckingProfile(false);
    }

    protectSetupRoute().catch(() => {
      if (isActive) {
        setErrorMessage(
          'プロフィール状態を確認できませんでした。もう一度お試しください。',
        );
        setIsCheckingProfile(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const handlePublicUserIdChange = useCallback((value: string) => {
    setPublicUserId(normalizePublicUserId(value));
  }, []);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);

    const validationResult = validateInitialSetupInput({
      displayName,
      publicUserId,
    });

    if (!validationResult.isValid) {
      setErrorMessage(getValidationMessage(validationResult.code));
      return;
    }

    setDisplayName(validationResult.value.displayName);
    setPublicUserId(validationResult.value.publicUserId);
    setIsSubmitting(true);

    try {
      await createProfile(validationResult.value);
      router.replace('/home');
    } catch (error) {
      if (
        error instanceof UserServiceError &&
        error.code === 'not_authenticated'
      ) {
        router.replace('/signin');
        return;
      }

      if (
        error instanceof UserServiceError &&
        error.code === 'profile_already_created'
      ) {
        const profile = await getMyProfile();

        if (profile) {
          router.replace('/home');
          return;
        }
      }

      setErrorMessage(getCreateProfileErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, publicUserId]);

  if (isCheckingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text>確認中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text>プロフィール設定</Text>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          onChangeText={handlePublicUserIdChange}
          placeholder="ユーザーID"
          style={styles.input}
          value={publicUserId}
        />

        <TextInput
          editable={!isSubmitting}
          onChangeText={setDisplayName}
          placeholder="表示名"
          style={styles.input}
          value={displayName}
        />

        <Button
          disabled={isSubmitting}
          onPress={handleSubmit}
          title={isSubmitting ? '作成中...' : '登録'}
        />

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  input: {
    borderColor: '#999999',
    borderWidth: 1,
    padding: 12,
  },
  errorText: {
    color: '#b42318',
  },
});
