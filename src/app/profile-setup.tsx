import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  PROFILE_ICON_LABELS,
  PROFILE_ICON_SOURCES,
} from '@/constants/profile-icons';
import { getCurrentUserId } from '@/services/auth';
import {
  DEFAULT_PROFILE_ICON_ID,
  PROFILE_ICON_IDS,
  UserServiceError,
  createProfile,
  getMyProfile,
  normalizePublicUserId,
  validateInitialSetupInput,
  type InitialSetupValidationErrorCode,
  type ProfileIconId,
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
  const [iconId, setIconId] = useState<ProfileIconId>(DEFAULT_PROFILE_ICON_ID);
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
      await createProfile({ ...validationResult.value, iconId });
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
  }, [displayName, iconId, publicUserId]);

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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>プロフィール設定</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatarPreview}>
            <Image
              contentFit="cover"
              source={PROFILE_ICON_SOURCES[iconId]}
              style={styles.avatarPreviewImage}
            />
          </View>

          <View style={styles.iconGrid}>
            {PROFILE_ICON_IDS.map((id) => {
              const isSelected = id === iconId;

              return (
                <Pressable
                  accessibilityLabel={PROFILE_ICON_LABELS[id]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  disabled={isSubmitting}
                  key={id}
                  onPress={() => setIconId(id)}
                  style={({ pressed }) => [
                    styles.iconOption,
                    isSelected && styles.iconOptionSelected,
                    pressed && styles.iconOptionPressed,
                  ]}
                >
                  <Image
                    contentFit="cover"
                    source={PROFILE_ICON_SOURCES[id]}
                    style={styles.iconOptionImage}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          onChangeText={handlePublicUserIdChange}
          placeholder="ユーザーID"
          placeholderTextColor="#a3a3a3"
          style={styles.input}
          value={publicUserId}
        />

        <TextInput
          editable={!isSubmitting}
          onChangeText={setDisplayName}
          placeholder="表示名"
          placeholderTextColor="#a3a3a3"
          style={styles.input}
          value={displayName}
        />

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '作成中...' : '登録'}
          </Text>
        </Pressable>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  container: {
    flexGrow: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    color: '#171717',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    gap: 20,
    marginVertical: 8,
  },
  avatarPreview: {
    alignItems: 'center',
    backgroundColor: '#e5e5e5',
    borderColor: '#f5f5f5',
    borderRadius: 63,
    borderWidth: 2,
    height: 126,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 126,
  },
  avatarPreviewImage: {
    height: '100%',
    width: '100%',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  iconOption: {
    borderColor: 'transparent',
    borderRadius: 30,
    borderWidth: 3,
    height: 60,
    overflow: 'hidden',
    width: 60,
  },
  iconOptionSelected: {
    borderColor: '#171717',
  },
  iconOptionPressed: {
    opacity: 0.7,
  },
  iconOptionImage: {
    height: '100%',
    width: '100%',
  },
  input: {
    backgroundColor: '#fafafa',
    borderColor: '#f5f5f5',
    borderRadius: 11,
    borderWidth: 2,
    color: '#171717',
    fontSize: 15,
    minHeight: 57,
    paddingHorizontal: 16,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 56,
    marginTop: 8,
  },
  submitButtonPressed: {
    opacity: 0.82,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
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
