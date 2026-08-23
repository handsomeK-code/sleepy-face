// src/app/wake-friends.tsx

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PROFILE_ICON_SOURCES } from '@/constants/profile-icons';
import {
  getWakeFriendsScreenData,
  requestFriendWakeAlarm,
  type WakeFriendTarget,
} from '@/services/friend-wake-alarm';

function formatFailureTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WakeFriendsScreen() {
  const [targets, setTargets] = useState<WakeFriendTarget[]>([]);
  const [requesterCanRing, setRequesterCanRing] = useState(false);
  const [requestingProfileId, setRequestingProfileId] = useState<string | null>(
    null,
  );
  const [sentProfileIds, setSentProfileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTargets = useCallback(async () => {
    const data = await getWakeFriendsScreenData();

    setTargets(data.targets);
    setRequesterCanRing(data.requesterCanRing);
  }, []);

  useEffect(() => {
    let isActive = true;

    getWakeFriendsScreenData()
      .then((data) => {
        if (!isActive) return;

        setTargets(data.targets);
        setRequesterCanRing(data.requesterCanRing);
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage('友達の状態を取得できませんでした。');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setErrorMessage(null);
    setIsRefreshing(true);

    try {
      await loadTargets();
    } catch {
      setErrorMessage('友達の状態を更新できませんでした。');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTargets]);

  const handleRing = useCallback(async (target: WakeFriendTarget) => {
    setErrorMessage(null);
    setRequestingProfileId(target.profileId);

    try {
      await requestFriendWakeAlarm(target.profileId);

      setSentProfileIds((current) => {
        const next = new Set(current);
        next.add(target.profileId);
        return next;
      });
    } catch {
      setErrorMessage(
        `${target.displayName}さんにアラームを送信できませんでした。`,
      );
    } finally {
      setRequestingProfileId(null);
    }
  }, []);

  const renderItem: ListRenderItem<WakeFriendTarget> = ({ item }) => {
    const isSending = requestingProfileId === item.profileId;
    const isSent = sentProfileIds.has(item.profileId);
    const isDisabled =
      requestingProfileId !== null ||
      isSent ||
      !item.canRing ||
      !requesterCanRing;

    return (
      <View style={styles.friendCard}>
        <View style={styles.profileArea}>
          <View style={styles.avatar}>
            <Image
              contentFit="cover"
              source={PROFILE_ICON_SOURCES[item.iconId]}
              style={styles.avatarImage}
            />
          </View>

          <View style={styles.profileText}>
            <Text style={styles.displayName}>{item.displayName}</Text>
            <Text style={styles.userId}>@{item.userId}</Text>
            <Text style={styles.failureText}>
              {formatFailureTime(item.failedAt)} に起床失敗
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={`${item.displayName}さんにアラームを鳴らす`}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={() => handleRing(item)}
          style={({ pressed }) => [
            styles.alarmButton,
            pressed && styles.buttonPressed,
            isDisabled && styles.alarmButtonDisabled,
          ]}
        >
          {isSending ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <SymbolView
              name={{ ios: 'alarm.fill', android: 'alarm', web: 'alarm' }}
              size={20}
              tintColor="#ffffff"
              type="monochrome"
            />
          )}

          <Text style={styles.alarmButtonText}>
            {isSending ? '送信中' : isSent ? '送信済み' : '鳴らす'}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="ホームに戻る"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace('/home')}
            style={styles.closeButton}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={24}
              tintColor="#737373"
              type="monochrome"
            />
          </Pressable>

          <Text style={styles.title}>友達を起こす</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            起床に失敗した友達へアラームを送れます。
          </Text>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#171717" />
              <Text style={styles.loadingText}>友達を確認中...</Text>
            </View>
          ) : (
            <FlatList
              contentContainerStyle={styles.list}
              data={requesterCanRing ? targets : []}
              keyExtractor={(item) => item.profileId}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>
                    {requesterCanRing
                      ? '今起こせる友達はいません'
                      : '起床成功後に利用できます'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {requesterCanRing
                      ? '新しく起床に失敗した友達がいる場合、ここに表示されます。'
                      : '今日の起床チャレンジを完了してください。'}
                  </Text>
                </View>
              }
              onRefresh={handleRefresh}
              refreshing={isRefreshing}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#f5f5f5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 61,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    left: 18,
    position: 'absolute',
    width: 44,
  },
  title: {
    color: '#171717',
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    color: '#737373',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  list: {
    gap: 10,
    paddingBottom: 32,
  },
  friendCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
  },
  profileArea: {
    alignItems: 'center',
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 180,
  },
  avatar: {
    backgroundColor: '#e5e5e5',
    borderRadius: 24,
    height: 48,
    marginRight: 12,
    overflow: 'hidden',
    width: 48,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  profileText: {
    flex: 1,
  },
  displayName: {
    color: '#171717',
    fontSize: 15,
    fontWeight: '800',
  },
  userId: {
    color: '#737373',
    fontSize: 13,
    marginTop: 3,
  },
  failureText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  alarmButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  alarmButtonDisabled: {
    backgroundColor: '#a3a3a3',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  alarmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 44,
  },
  loadingText: {
    color: '#737373',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#171717',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#737373',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
