import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AlarmServiceError,
  deleteSavedAlarm,
  listSavedAlarms,
  updateSavedAlarm,
  type Weekday,
} from '@/services/alarm';

const ITEM_HEIGHT = 64;
const WHEEL_VIEWPORT_HEIGHT = ITEM_HEIGHT;
const WHEEL_VERTICAL_PADDING = (WHEEL_VIEWPORT_HEIGHT - ITEM_HEIGHT) / 2;
const WHEEL_REPEAT_COUNT = 80;
const WHEEL_START_REPEAT = Math.floor(WHEEL_REPEAT_COUNT / 2);
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const WEEKDAY_OPTIONS: { label: string; value: Weekday }[] = [
  { label: '月', value: 1 },
  { label: '火', value: 2 },
  { label: '水', value: 3 },
  { label: '木', value: 4 },
  { label: '金', value: 5 },
  { label: '土', value: 6 },
  { label: '日', value: 0 },
];

function formatNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function getAlarmErrorMessage(error: unknown): string {
  if (error instanceof AlarmServiceError) {
    if (error.code === 'weekday_already_used') {
      return '選択した曜日には、すでに別のアラームがあります。';
    }

    if (error.code === 'invalid_alarm_input') {
      return '時刻と曜日を確認してください。';
    }

    if (error.code === 'saved_alarm_not_found') {
      return 'アラームが見つかりませんでした。';
    }
  }

  return 'アラームを更新できませんでした。';
}

function TimeWheel({
  onChange,
  options,
  value,
}: {
  onChange: (value: number) => void;
  options: number[];
  value: number;
}) {
  const loopedOptions = useMemo(
    () => Array.from({ length: WHEEL_REPEAT_COUNT }).flatMap(() => options),
    [options],
  );
  const initialIndex = WHEEL_START_REPEAT * options.length + value;

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.y / ITEM_HEIGHT,
      );
      const safeIndex = Math.min(
        Math.max(nextIndex, 0),
        loopedOptions.length - 1,
      );

      onChange(loopedOptions[safeIndex] % options.length);
    },
    [loopedOptions, onChange, options.length],
  );

  return (
    <View style={styles.timeWheel}>
      <SymbolView
        name={{
          ios: 'chevron.up',
          android: 'keyboard_arrow_up',
          web: 'keyboard_arrow_up',
        }}
        size={22}
        tintColor="#d4d4d4"
        type="monochrome"
      />

      <FlatList
        contentContainerStyle={styles.timeWheelContent}
        data={loopedOptions}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
        })}
        initialNumToRender={7}
        initialScrollIndex={initialIndex}
        keyExtractor={(_, index) => String(index)}
        maxToRenderPerBatch={8}
        nestedScrollEnabled
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        removeClippedSubviews
        renderItem={({ item }) => (
          <View style={styles.timeItem}>
            <Text
              style={[
                styles.timeItemText,
                item === value
                  ? styles.timeItemTextActive
                  : styles.timeItemTextMuted,
              ]}
            >
              {formatNumber(item)}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        style={styles.timeWheelScroll}
        windowSize={5}
      />

      <SymbolView
        name={{
          ios: 'chevron.down',
          android: 'keyboard_arrow_down',
          web: 'keyboard_arrow_down',
        }}
        size={22}
        tintColor="#d4d4d4"
        type="monochrome"
      />
    </View>
  );
}

export default function EditAlarmScreen() {
  const params = useLocalSearchParams();
  const rawAlarmId = params.id;
  const alarmId = Array.isArray(rawAlarmId) ? rawAlarmId[0] : rawAlarmId;

  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([
    1, 2, 3, 4, 5,
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAlarm() {
      if (!alarmId) {
        setErrorMessage('編集するアラームが指定されていません。');
        setIsLoading(false);
        return;
      }

      try {
        const savedAlarms = await listSavedAlarms();
        const targetAlarm = savedAlarms.find((alarm) => alarm.id === alarmId);

        if (!targetAlarm) {
          throw new AlarmServiceError(
            'saved_alarm_not_found',
            'Saved Alarm could not be found.',
          );
        }

        if (!isMounted) {
          return;
        }

        setHour(targetAlarm.hour);
        setMinute(targetAlarm.minute);
        setSelectedWeekdays(targetAlarm.weekdays);
        setErrorMessage(null);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getAlarmErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAlarm();

    return () => {
      isMounted = false;
    };
  }, [alarmId]);

  const toggleWeekday = useCallback((weekday: Weekday) => {
    setErrorMessage(null);
    setSelectedWeekdays((currentWeekdays) =>
      currentWeekdays.includes(weekday)
        ? currentWeekdays.filter((currentWeekday) => currentWeekday !== weekday)
        : [...currentWeekdays, weekday],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!alarmId) {
      setErrorMessage('編集するアラームが指定されていません。');
      return;
    }

    if (selectedWeekdays.length === 0) {
      setErrorMessage('曜日を1つ以上選択してください。');
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      await updateSavedAlarm(alarmId, {
        hour,
        minute,
        weekdays: selectedWeekdays,
      });
      router.replace('/alarms');
    } catch (error) {
      setErrorMessage(getAlarmErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [alarmId, hour, minute, selectedWeekdays]);

  const handleDelete = useCallback(async () => {
    if (!alarmId) {
      setErrorMessage('削除するアラームが指定されていません。');
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteSavedAlarm(alarmId);
      router.replace('/alarms');
    } catch (error) {
      setErrorMessage(getAlarmErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }, [alarmId]);

  const isBusy = isLoading || isSaving || isDeleting;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="アラーム一覧に戻る"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace('/alarms')}
            style={styles.closeButton}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={24}
              tintColor="#737373"
              type="monochrome"
            />
          </Pressable>
          <Text style={styles.title}>アラームを編集</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingArea}>
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : (
          <>
            <View style={styles.timeSection}>
              <TimeWheel onChange={setHour} options={HOURS} value={hour} />
              <Text style={styles.timeColon}>:</Text>
              <TimeWheel
                onChange={setMinute}
                options={MINUTES}
                value={minute}
              />
            </View>

            <View style={styles.weekdaySection}>
              <Text style={styles.weekdayTitle}>繰り返し</Text>
              <View style={styles.weekdayRow}>
                {WEEKDAY_OPTIONS.map((weekday) => {
                  const isSelected = selectedWeekdays.includes(weekday.value);

                  return (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      key={weekday.value}
                      onPress={() => toggleWeekday(weekday.value)}
                      style={[
                        styles.weekdayButton,
                        isSelected && styles.weekdayButtonSelected,
                        isBusy && styles.disabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          isSelected && styles.weekdayTextSelected,
                        ]}
                      >
                        {weekday.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                (pressed || isDeleting) && styles.deleteButtonPressed,
              ]}
            >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? '削除中...' : 'アラームを削除'}
              </Text>
            </Pressable>
          </>
        )}

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <View pointerEvents="none" style={styles.footerDivider} />

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              (pressed || isSaving || isBusy) && styles.saveButtonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? '保存中...' : '保存'}
            </Text>
          </Pressable>
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
    height: 61,
    justifyContent: 'center',
    paddingHorizontal: 22,
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
  loadingArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#737373',
    fontSize: 15,
    fontWeight: '700',
  },
  timeSection: {
    alignItems: 'center',
    borderBottomColor: '#f5f5f5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 270,
    justifyContent: 'center',
  },
  timeWheel: {
    alignItems: 'center',
    height: 150,
    justifyContent: 'center',
    width: 96,
  },
  timeWheelScroll: {
    height: WHEEL_VIEWPORT_HEIGHT,
  },
  timeWheelContent: {
    paddingVertical: WHEEL_VERTICAL_PADDING,
  },
  timeItem: {
    alignItems: 'center',
    height: ITEM_HEIGHT,
    justifyContent: 'center',
  },
  timeItemText: {
    fontWeight: '800',
  },
  timeItemTextActive: {
    color: '#171717',
    fontSize: 60,
    lineHeight: 66,
  },
  timeItemTextMuted: {
    color: '#d4d4d4',
    fontSize: 22,
    lineHeight: 28,
  },
  timeColon: {
    color: '#d4d4d4',
    fontSize: 54,
    fontWeight: '800',
    lineHeight: 62,
    marginHorizontal: 6,
  },
  weekdaySection: {
    paddingHorizontal: 40,
    paddingTop: 48,
  },
  weekdayTitle: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 18,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  weekdayButton: {
    alignItems: 'center',
    borderColor: '#e5e5e5',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  weekdayButtonSelected: {
    backgroundColor: '#171717',
  },
  weekdayText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '800',
  },
  weekdayTextSelected: {
    color: '#ffffff',
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 46,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deleteButtonPressed: {
    opacity: 0.62,
  },
  deleteButtonText: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '800',
    textDecorationColor: '#171717',
    textDecorationLine: 'underline',
  },
  disabled: {
    opacity: 0.58,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 21,
    marginHorizontal: 36,
    marginTop: 24,
    textAlign: 'center',
  },
  footerDivider: {
    backgroundColor: '#f5f5f5',
    bottom: 104,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  footer: {
    bottom: 24,
    left: 36,
    position: 'absolute',
    right: 36,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
  },
  saveButtonPressed: {
    opacity: 0.78,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
});
