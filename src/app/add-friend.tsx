import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { PROFILE_ICON_SOURCES } from '@/constants/profile-icons';
import {
  FriendServiceError,
  addFriend,
  listFriends,
  listFriendRelations,
  normalizeFriendSearchQuery,
  searchProfiles,
  type FriendProfile,
  type FriendRelation,
  type FriendSearchProfile,
} from '@/services/friend';

function getFriendErrorMessage(error: unknown): string {
  if (error instanceof FriendServiceError) {
    switch (error.code) {
      case 'not_authenticated':
        return 'ログイン状態を確認できませんでした。もう一度ログインしてください。';
      case 'self_relation':
        return '自分自身は友達に追加できません。';
      case 'already_friend':
        return 'すでに友達に追加されています。';
      case 'unexpected_error':
        return '友達情報を更新できませんでした。もう一度お試しください。';
    }
  }

  return '友達情報を更新できませんでした。もう一度お試しください。';
}

export default function AddFriendScreen() {
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [relations, setRelations] = useState<FriendRelation[]>([]);
  const [results, setResults] = useState<FriendSearchProfile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addingProfileId, setAddingProfileId] = useState<string | null>(null);
  const [isLoadingRelations, setIsLoadingRelations] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const friendProfileIds = useMemo(() => {
    const ids = new Set<string>();

    for (const relation of relations) {
      ids.add(relation.profileId);
      ids.add(relation.friendProfileId);
    }

    return ids;
  }, [relations]);

  useEffect(() => {
    let isActive = true;

    Promise.all([listFriendRelations(), listFriends()])
      .then(([nextRelations, nextFriends]) => {
        if (isActive) {
          setRelations(nextRelations);
          setFriends(nextFriends);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(getFriendErrorMessage(error));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingRelations(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleSearch = useCallback(async () => {
    const normalizedQuery = normalizeFriendSearchQuery(query);

    setErrorMessage(null);
    setSuccessMessage(null);

    if (normalizedQuery.length < 2) {
      setResults([]);
      setErrorMessage('ユーザーIDか表示名を2文字以上入力してください。');
      return;
    }

    setQuery(normalizedQuery);
    setIsSearching(true);

    try {
      const profiles = await searchProfiles(normalizedQuery);
      setResults(profiles);

      if (profiles.length === 0) {
        setErrorMessage('該当するユーザーが見つかりませんでした。');
      }
    } catch (error) {
      setErrorMessage(getFriendErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleAddFriend = useCallback(async (profile: FriendSearchProfile) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setAddingProfileId(profile.id);

    try {
      const relation = await addFriend(profile.id);
      setRelations((currentRelations) => [relation, ...currentRelations]);
      setFriends((currentFriends) => [
        {
          ...profile,
          relationId: relation.id,
        },
        ...currentFriends,
      ]);
      setSuccessMessage(`${profile.displayName}を友達に追加しました。`);
    } catch (error) {
      setErrorMessage(getFriendErrorMessage(error));
    } finally {
      setAddingProfileId(null);
    }
  }, []);

  const renderItem: ListRenderItem<FriendSearchProfile> = ({ item }) => {
    const isFriend = friendProfileIds.has(item.id);
    const isAdding = addingProfileId === item.id;

    return (
      <View style={styles.resultCard}>
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
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isFriend || isAdding}
          onPress={() => handleAddFriend(item)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.buttonPressed,
            (isFriend || isAdding) && styles.addButtonDisabled,
          ]}
        >
          <Text style={styles.addButtonText}>
            {isFriend ? '追加済み' : isAdding ? '追加中...' : '追加'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderFriendItem: ListRenderItem<FriendProfile> = ({ item }) => (
    <View style={styles.friendCard}>
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
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>友達</Text>
        </View>

        <View style={styles.content}>
          {isLoadingRelations ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#171717" />
              <Text style={styles.loadingText}>友達情報を確認中...</Text>
            </View>
          ) : (
            <FlatList
              contentContainerStyle={styles.resultList}
              data={results}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    友達に追加したいユーザーを検索してください。
                  </Text>
                </View>
              }
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.description}>
                    ユーザーIDまたは表示名で検索できます。
                  </Text>

                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSearching}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    placeholder="ユーザーID / 表示名"
                    placeholderTextColor="#a3a3a3"
                    returnKeyType="search"
                    style={styles.input}
                    value={query}
                  />

                  <Pressable
                    accessibilityRole="button"
                    disabled={isSearching}
                    onPress={handleSearch}
                    style={({ pressed }) => [
                      styles.searchButton,
                      pressed && styles.buttonPressed,
                      isSearching && styles.searchButtonDisabled,
                    ]}
                  >
                    <Text style={styles.searchButtonText}>
                      {isSearching ? '検索中...' : '検索'}
                    </Text>
                  </Pressable>

                  {errorMessage && (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  )}
                  {successMessage && (
                    <Text style={styles.successText}>{successMessage}</Text>
                  )}

                  <Text style={styles.sectionTitle}>追加済みの友達</Text>
                  <FlatList
                    contentContainerStyle={styles.friendList}
                    data={friends}
                    horizontal
                    keyExtractor={(item) => item.relationId}
                    ListEmptyComponent={
                      <View style={styles.emptyFriendBox}>
                        <Text style={styles.emptyText}>
                          まだ友達が追加されていません。
                        </Text>
                      </View>
                    }
                    renderItem={renderFriendItem}
                    showsHorizontalScrollIndicator={false}
                  />

                  <Text style={styles.sectionTitle}>検索結果</Text>
                </View>
              }
              renderItem={renderItem}
            />
          )}
        </View>

        <BottomNav activeRoute="/add-friend" />
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
    borderBottomColor: '#f5f5f5',
    borderBottomWidth: 1,
    height: 61,
    justifyContent: 'center',
    paddingHorizontal: 28,
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
  input: {
    backgroundColor: '#fafafa',
    borderColor: '#f5f5f5',
    borderRadius: 11,
    borderWidth: 2,
    color: '#171717',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 56,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  successText: {
    color: '#067647',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    color: '#737373',
    fontSize: 14,
  },
  listHeader: {
    paddingBottom: 4,
  },
  sectionTitle: {
    color: '#171717',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 20,
  },
  friendList: {
    gap: 10,
    paddingRight: 16,
  },
  friendCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 78,
    padding: 12,
    width: 220,
  },
  resultList: {
    gap: 10,
    paddingBottom: 116,
  },
  resultCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 82,
    padding: 12,
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
    marginRight: 12,
  },
  displayName: {
    color: '#171717',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  userId: {
    color: '#737373',
    fontSize: 13,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 76,
    paddingHorizontal: 12,
  },
  addButtonDisabled: {
    backgroundColor: '#a3a3a3',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  emptyBox: {
    backgroundColor: '#fafafa',
    borderColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  emptyFriendBox: {
    backgroundColor: '#fafafa',
    borderColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    width: 220,
  },
  emptyText: {
    color: '#737373',
    fontSize: 14,
    lineHeight: 21,
  },
});
