import type { ProfileIconId } from '@/services/user';

export const PROFILE_ICON_SOURCES: Record<ProfileIconId, number> = {
  boy: require('@/assets/images/profile-icons/boy.png'),
  child: require('@/assets/images/profile-icons/child.png'),
  grandmother: require('@/assets/images/profile-icons/grandmother.png'),
  human: require('@/assets/images/profile-icons/human.png'),
  man: require('@/assets/images/profile-icons/man.png'),
  man2: require('@/assets/images/profile-icons/man2.png'),
  'old-man': require('@/assets/images/profile-icons/old-man.png'),
  woman: require('@/assets/images/profile-icons/woman.png'),
};

export const PROFILE_ICON_LABELS: Record<ProfileIconId, string> = {
  boy: '男の子',
  child: '女の子',
  grandmother: 'おばあちゃん',
  human: '標準',
  man: '男性1',
  man2: '男性2',
  'old-man': 'おじいちゃん',
  woman: '女性',
};
