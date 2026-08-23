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

import { FriendListLoadingSkeleton } from '@/components/loading-skeletons';
import { PROFILE_ICON_SOURCES } from '@/constants/profile-icons';
import {
  activateWakeFriendAlarm,
  listWakeFriendTargets,
  type WakeFriendTarget,
} from '@/services/wake-friends';

function getLoadErrorMessage(): string {
  return '起こせる友達を読み込めませんでした。もう一度お試しください。';
}

export default function WakeFriendsScreen() {
  const [targets, setTargets] = useState<WakeFriendTarget[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activatingProfileId, setActivatingProfileId] = useState<string | null>(
    null,
  );

  const loadTargets = useCallback(async () => {
    setTargets(await listWakeFriendTargets());
  }, []);

  useEffect(() => {
    let isActive = true;

    listWakeFriendTargets()
      .then((nextTargets) => {
        if (isActive) {
          setTargets(nextTargets);
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage(getLoadErrorMessage());
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
    setSuccessMessage(null);
    setIsRefreshing(true);

    try {
      await loadTargets();
    } catch {
      setErrorMessage(getLoadErrorMessage());
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTargets]);

  const handleActivateAlarm = useCallback(async (target: WakeFriendTarget) => {
    setActivatingProfileId(target.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await activateWakeFriendAlarm(target.failureEntryId);
      setTargets((currentTargets) =>
        currentTargets.filter(
          (currentTarget) => currentTarget.id !== target.id,
        ),
      );
      setSuccessMessage(`${target.displayName}さんにアラームを送信しました。`);
    } catch {
      setErrorMessage(
        `${target.displayName}さんにアラームを送信できませんでした。`,
      );
    } finally {
      setActivatingProfileId(null);
    }
  }, []);

  const renderItem: ListRenderItem<WakeFriendTarget> = ({ item }) => {
    const isActivating = activatingProfileId === item.id;
    const isDisabled = activatingProfileId !== null;

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
            <Text style={styles.failureStatus}>起床失敗中</Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={`${item.displayName}さんにアラームを鳴らす`}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={() => handleActivateAlarm(item)}
          style={({ pressed }) => [
            styles.alarmButton,
            pressed && styles.buttonPressed,
            isDisabled && !isActivating && styles.alarmButtonDisabled,
          ]}
        >
          {isActivating ? (
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
            {isActivating ? '送信中' : '鳴らす'}
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
            起床に失敗した友達にアラームを鳴らせます。
          </Text>

          {errorMessage && (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {errorMessage}
            </Text>
          )}
          {successMessage && (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {successMessage}
            </Text>
          )}

          {isLoading ? (
            <FriendListLoadingSkeleton />
          ) : (
            <FlatList
              contentContainerStyle={styles.friendList}
              data={targets}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIcon}>
                    <SymbolView
                      name={{
                        ios: 'moon.zzz',
                        android: 'bedtime',
                        web: 'bedtime',
                      }}
                      size={30}
                      tintColor="#737373"
                      type="monochrome"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    今起こせる友達はいません
                  </Text>
                  <Text style={styles.emptyText}>
                    起床に失敗した友達がいるとここに表示されます。
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
    paddingHorizontal: 72,
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
    fontFamily: 'NotoSansJP_700Bold',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    color: '#737373',
    fontFamily: 'NotoSansJP_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  errorText: {
    color: '#b42318',
    fontFamily: 'NotoSansJP_500Medium',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  successText: {
    color: '#067647',
    fontFamily: 'NotoSansJP_500Medium',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  friendList: {
    flexGrow: 1,
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
    alignItems: 'center',
    backgroundColor: '#e5e5e5',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
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
    fontFamily: 'NotoSansJP_700Bold',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  userId: {
    color: '#737373',
    fontFamily: 'NotoSansJP_400Regular',
    fontSize: 13,
  },
  failureStatus: {
    color: '#b45309',
    fontFamily: 'NotoSansJP_700Bold',
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
    minWidth: 104,
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
    fontFamily: 'NotoSansJP_700Bold',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  emptyTitle: {
    color: '#171717',
    fontFamily: 'NotoSansJP_700Bold',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#737373',
    fontFamily: 'NotoSansJP_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
