import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type LoadingTone = 'dark' | 'light';
type LoadingVariant = 'screen' | 'section' | 'inline';

type LoadingIndicatorProps = {
  accessibilityLabel?: string;
  size?: 'small' | 'large';
  tone?: LoadingTone;
};

type LoadingStateProps = LoadingIndicatorProps & {
  message?: string;
  style?: StyleProp<ViewStyle>;
  variant?: LoadingVariant;
};

type LoadingButtonContentProps = {
  label: string;
  loading: boolean;
  loadingLabel: string;
  textStyle: StyleProp<TextStyle>;
  tone?: LoadingTone;
};

function getIndicatorColor(tone: LoadingTone): string {
  return tone === 'light' ? '#ffffff' : '#171717';
}

export function LoadingIndicator({
  accessibilityLabel = '読み込み中',
  size = 'small',
  tone = 'dark',
}: LoadingIndicatorProps) {
  return (
    <ActivityIndicator
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      color={getIndicatorColor(tone)}
      size={size}
    />
  );
}

export function LoadingState({
  accessibilityLabel,
  message = '読み込み中...',
  size = 'small',
  style,
  tone = 'dark',
  variant = 'section',
}: LoadingStateProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.state, styles[variant], style]}
    >
      <LoadingIndicator
        accessibilityLabel={accessibilityLabel ?? message}
        size={size}
        tone={tone}
      />
      {message.length > 0 && (
        <Text
          style={tone === 'light' ? styles.lightMessage : styles.darkMessage}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

export function LoadingButtonContent({
  label,
  loading,
  loadingLabel,
  textStyle,
  tone = 'dark',
}: LoadingButtonContentProps) {
  if (!loading) {
    return <Text style={textStyle}>{label}</Text>;
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.buttonContent}>
      <LoadingIndicator accessibilityLabel={loadingLabel} tone={tone} />
      <Text style={textStyle}>{loadingLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  inline: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  darkMessage: {
    color: '#737373',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  lightMessage: {
    color: '#a3a3a3',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
});
