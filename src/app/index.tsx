import { type Href, router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const screens = [
  { href: '/login', label: 'ログイン画面' },
  { href: '/signup', label: '新規登録画面' },
  { href: '/profile-setup', label: 'プロフィール設定画面' },
  { href: '/home', label: 'ホーム画面' },
  { href: '/add-friend', label: '友達追加画面' },
  { href: '/alarms', label: 'アラーム一覧画面' },
  { href: '/add-alarm', label: 'アラーム新規作成画面' },
  { href: '/edit-alarm', label: 'アラーム編集画面' },
  { href: '/ringing', label: 'アラーム鳴動画面' },
  { href: '/face-check', label: '顔撮影・顔判定画面' },
  { href: '/face-check-success', label: '顔判定成功画面' },
  { href: '/face-check-failure', label: '顔判定失敗画面' },
  { href: '/quiz', label: '起床クイズ画面' },
  { href: '/quiz-success', label: 'クイズ成功画面' },
  { href: '/quiz-failure', label: 'クイズ失敗画面' },
] as const;

export default function Index() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SLEEPY FACE</Text>
          <Text style={styles.title}>画面一覧</Text>
          <Text style={styles.description}>
            確認したい画面を選択してください。
          </Text>
        </View>

        <View style={styles.accordion}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            onPress={() => setIsOpen((current) => !current)}
            style={({ pressed }) => [
              styles.accordionButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.accordionButtonText}>画面を選択</Text>
            <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {isOpen && (
            <View style={styles.screenList}>
              {screens.map((screen, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={screen.href}
                  onPress={() => router.navigate(screen.href as Href)}
                  style={({ pressed }) => [
                    styles.screenButton,
                    index < screens.length - 1 && styles.screenButtonBorder,
                    pressed && styles.screenButtonPressed,
                  ]}
                >
                  <Text style={styles.screenButtonText}>{screen.label}</Text>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  eyebrow: {
    color: '#536dfe',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: '#172033',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  description: {
    color: '#657086',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  accordion: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e7f0',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionButton: {
    alignItems: 'center',
    backgroundColor: '#536dfe',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: 20,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  accordionButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  chevron: {
    color: '#ffffff',
    fontSize: 12,
  },
  screenList: {
    paddingHorizontal: 18,
  },
  screenButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 2,
  },
  screenButtonBorder: {
    borderBottomColor: '#edf0f5',
    borderBottomWidth: 1,
  },
  screenButtonPressed: {
    opacity: 0.5,
  },
  screenButtonText: {
    color: '#273147',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  arrow: {
    color: '#8c97aa',
    fontSize: 26,
    marginLeft: 12,
  },
});
