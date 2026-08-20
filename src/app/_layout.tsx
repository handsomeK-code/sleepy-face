import { Stack, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppRegistry, InteractionManager } from 'react-native';

import { resyncAllScheduledAlarms } from '@/services/alarm';
import { getCurrentUserId } from '@/services/auth';
import { getMyProfile } from '@/services/user';
import {
  clearWakeChallengeAttempt,
  getAbandonedWakeChallengeAttemptOutcome,
  getWakeChallengeAttempt,
} from '@/services/wake-challenge-attempt';

const SAVED_ALARM_BOOT_RESYNC_TASK_NAME = 'SavedAlarmBootResync';

AppRegistry.registerHeadlessTask(
  SAVED_ALARM_BOOT_RESYNC_TASK_NAME,
  () => () => resyncAllScheduledAlarms(),
);

const DEV_INDEX_ROUTE = '/';
const DEV_TEST_ROUTES = new Set([
  '/alarm-ring-test',
  '/ringing',
  '/timer-test',
]);
const AUTH_ROUTES = new Set(['/signin', '/signup']);

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

function isInitialSetupRoute(pathname: string): boolean {
  return pathname === '/profile-setup';
}

function shouldSkipProfileGate(pathname: string): boolean {
  return pathname === DEV_INDEX_ROUTE || DEV_TEST_ROUTES.has(pathname);
}

let hasCheckedAbandonedWakeChallengeAttempt = false;

async function checkAbandonedWakeChallengeAttempt(
  isStillActive: () => boolean,
) {
  if (hasCheckedAbandonedWakeChallengeAttempt) {
    return;
  }

  hasCheckedAbandonedWakeChallengeAttempt = true;

  const record = await getWakeChallengeAttempt();
  const outcome = getAbandonedWakeChallengeAttemptOutcome(record);

  if (!outcome.abandoned) {
    return;
  }

  await clearWakeChallengeAttempt();

  if (!isStillActive()) {
    return;
  }

  router.replace({
    pathname: '/quiz-failure',
    params: { reason: 'app-quit' },
  });
}

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    let isActive = true;

    async function protectRoute() {
      await checkAbandonedWakeChallengeAttempt(() => isActive);

      if (!isActive) {
        return;
      }

      if (shouldSkipProfileGate(pathname)) {
        return;
      }

      const authUserId = await getCurrentUserId();

      if (!isActive) {
        return;
      }

      if (!authUserId) {
        if (!isAuthRoute(pathname)) {
          router.replace('/signin');
        }

        return;
      }

      const profile = await getMyProfile();

      if (!isActive) {
        return;
      }

      if (!profile) {
        if (!isInitialSetupRoute(pathname)) {
          router.replace('/profile-setup');
        }

        return;
      }

      if (isAuthRoute(pathname) || isInitialSetupRoute(pathname)) {
        // Home is typically the first screen mounted this session; replacing to it
        // synchronously here can catch Expo Router's native Stack mid-commit and briefly
        // render the built-in "Unmatched Route" screen before it settles (a known upstream
        // timing issue: https://github.com/expo/expo/issues/47687). Defer until after the
        // current interaction/commit settles to avoid the flash.
        InteractionManager.runAfterInteractions(() => {
          if (isActive) {
            router.replace('/home');
          }
        });
      }
    }

    protectRoute().catch(() => {
      if (pathname !== '/signin') {
        router.replace('/signin');
      }
    });

    return () => {
      isActive = false;
    };
  }, [pathname]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
