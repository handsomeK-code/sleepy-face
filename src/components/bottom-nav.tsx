import { router, type Href } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type BottomNavRoute =
  '/alarms' | '/home' | '/friends' | '/profile-setup';

type BottomNavTab = {
  icon: SymbolViewProps['name'];
  label: string;
  route: BottomNavRoute;
};

const BOTTOM_NAV_TABS: BottomNavTab[] = [
  {
    icon: { ios: 'alarm', android: 'alarm', web: 'alarm' },
    label: 'アラーム',
    route: '/alarms',
  },
  {
    icon: { ios: 'house', android: 'home', web: 'home' },
    label: 'ホーム',
    route: '/home',
  },
  {
    icon: { ios: 'person.2', android: 'group', web: 'group' },
    label: '友達',
    route: '/friends',
  },
  {
    icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
    label: '設定',
    route: '/profile-setup',
  },
];

type BottomNavProps = {
  activeRoute: BottomNavRoute;
};

export function BottomNav({ activeRoute }: BottomNavProps) {
  return (
    <View style={styles.bottomNav}>
      {BOTTOM_NAV_TABS.map((tab) => {
        const isActive = tab.route === activeRoute;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={tab.label}
            onPress={() => router.navigate(tab.route as Href)}
            style={styles.bottomNavItem}
          >
            <SymbolView
              name={tab.icon}
              size={24}
              tintColor={isActive ? '#171717' : '#a3a3a3'}
              type="monochrome"
            />
            <Text
              style={[
                styles.bottomNavLabel,
                isActive && styles.bottomNavLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopColor: '#f1f1f1',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    height: 74,
    justifyContent: 'space-around',
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  bottomNavItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 54,
  },
  bottomNavLabel: {
    color: '#a3a3a3',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomNavLabelActive: {
    color: '#171717',
  },
});
