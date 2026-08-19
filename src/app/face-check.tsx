import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ActionButton,
  ChallengeScreen,
  MAX_BAD_PHOTO_ATTEMPTS,
  challengeStyles,
  formatRemainingTime,
} from '@/components/wake-challenge-ui';
import {
  getAlarmTimerState,
  pauseTimer,
  resumeTimer,
  useAlarmTimer,
} from '@/services/alarm-timer';
import {
  checkFaceProof,
  shouldRetainFaceProofPhoto,
  type FaceProofResult,
} from '@/services/face-proof';
import {
  deleteFailurePhotoLocally,
  saveFailurePhotoLocally,
} from '@/services/wakeChallenge';
import { getNextBadPhotoAttemptCount } from '@/services/wake-challenge-rules';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '処理に失敗しました。';
}

function getFaceProofFailureMessage(
  result: Exclude<FaceProofResult, { status: 'passed' }>,
) {
  switch (result.reason) {
    case 'detector-error':
      return '顔判定に失敗しました。もう一度試してください。';
    case 'invalid-photo':
      return '写真を読み取れませんでした。もう一度撮影してください。';
    case 'no-face-detected':
      return '顔が検出できませんでした。';
    case 'unsupported-platform':
      return 'この端末では顔判定を利用できません。';
  }
}

export default function FaceCheckScreen() {
  const params = useLocalSearchParams<{
    alarmId?: string;
    badPhotoAttempts?: string;
  }>();
  const cameraRef = useRef<CameraView>(null);
  const timer = useAlarmTimer();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [message, setMessage] = useState('顔が写るように撮影してください。');
  const [isBusy, setIsBusy] = useState(false);
  const badPhotoAttempts = Number(params.badPhotoAttempts ?? '0') || 0;

  useEffect(() => {
    if (timer?.status === 'expired') {
      router.replace({
        pathname: '/quiz-failure',
        params: { reason: 'no-photo-timeout' },
      });
    }
  }, [timer?.status]);

  async function openCamera() {
    if (getAlarmTimerState()?.status === 'expired') {
      router.replace({
        pathname: '/quiz-failure',
        params: { reason: 'no-photo-timeout' },
      });
      return;
    }

    if (!permission?.granted) {
      const nextPermission = await requestPermission();

      if (!nextPermission.granted) {
        setMessage('カメラ権限が必要です。');
        return;
      }
    }

    setIsCameraOpen(true);
    setMessage('写真を撮影してください。');
  }

  async function takePhoto() {
    if (!cameraRef.current || isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });
      const savedPhoto = await saveFailurePhotoLocally(photo.uri);

      pauseTimer();
      const nextFaceProofResult = await checkFaceProof(savedPhoto.uri);

      setIsCameraOpen(false);

      if (shouldRetainFaceProofPhoto(nextFaceProofResult)) {
        router.replace({
          pathname: '/quiz',
          params: {
            alarmId: params.alarmId ?? '',
            localPhotoUri: savedPhoto.uri,
          },
        });
        return;
      }

      await deleteFailurePhotoLocally(savedPhoto.uri);

      const nextBadPhotoAttempts =
        getNextBadPhotoAttemptCount(badPhotoAttempts);

      if (nextBadPhotoAttempts >= MAX_BAD_PHOTO_ATTEMPTS) {
        router.replace({
          pathname: '/quiz-failure',
          params: { reason: 'bad-photo-limit' },
        });
        return;
      }

      resumeTimer();
      setMessage(
        `${getFaceProofFailureMessage(nextFaceProofResult)} あと${
          MAX_BAD_PHOTO_ATTEMPTS - nextBadPhotoAttempts
        }回撮影できます。`,
      );
      router.setParams({ badPhotoAttempts: String(nextBadPhotoAttempts) });
    } catch (error) {
      resumeTimer();
      setIsCameraOpen(false);
      setMessage(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  if (isCameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} facing="front" style={styles.camera} />
        <SafeAreaView style={styles.cameraTimerOverlay}>
          <Text style={styles.cameraTimer}>{formatRemainingTime(timer)}</Text>
        </SafeAreaView>
        <SafeAreaView style={styles.cameraControls}>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={takePhoto}
            style={({ pressed }) => [
              styles.shutterOuter,
              pressed && styles.buttonPressed,
              isBusy && styles.buttonDisabled,
            ]}
          >
            <View style={styles.shutterInner}>
              {isBusy && <ActivityIndicator color="#171717" />}
            </View>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <ChallengeScreen dark timer={timer}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <View style={styles.cameraIcon}>
            <View style={styles.cameraIconBump} />
            <View style={styles.cameraIconBody}>
              <View style={styles.cameraIconLens} />
            </View>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={challengeStyles.darkTitle}>顔写真を撮影</Text>
          <Text style={challengeStyles.darkCaption}>{message}</Text>
          <Text style={styles.attempts}>
            失敗 {badPhotoAttempts}/{MAX_BAD_PHOTO_ATTEMPTS}
          </Text>
        </View>

        <ActionButton
          label="カメラを起動"
          loading={isBusy}
          onPress={openCamera}
          variant="secondary"
        />
      </View>
    </ChallengeScreen>
  );
}

const styles = StyleSheet.create({
  attempts: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  camera: {
    flex: 1,
  },
  cameraContainer: {
    backgroundColor: '#000000',
    flex: 1,
  },
  cameraControls: {
    alignItems: 'center',
    backgroundColor: '#000000',
    height: 160,
    justifyContent: 'center',
  },
  cameraTimer: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  cameraTimerOverlay: {
    alignItems: 'center',
    left: 0,
    paddingTop: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  cameraIcon: {
    alignItems: 'center',
  },
  cameraIconBody: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    height: 20,
    justifyContent: 'center',
    width: 30,
  },
  cameraIconBump: {
    backgroundColor: '#ffffff',
    borderRadius: 2,
    height: 5,
    marginBottom: 1,
    width: 12,
  },
  cameraIconLens: {
    backgroundColor: '#171717',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 40,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  copy: {
    gap: 10,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderColor: '#ffffff',
    borderRadius: 48,
    borderWidth: 2,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  shutterInner: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    height: 64,
    width: 64,
  },
  shutterOuter: {
    alignItems: 'center',
    borderColor: '#ffffff',
    borderRadius: 38,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
});
