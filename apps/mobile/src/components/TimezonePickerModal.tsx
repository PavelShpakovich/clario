import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/colors';

export const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Гонолулу (UTC−10)' },
  { value: 'America/Anchorage', label: 'Анкоридж (UTC−9)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC−8)' },
  { value: 'America/Denver', label: 'Денвер (UTC−7)' },
  { value: 'America/Chicago', label: 'Чикаго (UTC−6)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC−5)' },
  { value: 'America/Toronto', label: 'Торонто (UTC−5)' },
  { value: 'America/Sao_Paulo', label: 'Сан-Паулу (UTC−3)' },
  { value: 'America/Buenos_Aires', label: 'Буэнос-Айрес (UTC−3)' },
  { value: 'Atlantic/Azores', label: 'Азорские о-ва (UTC−1)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)' },
  { value: 'Europe/Lisbon', label: 'Лиссабон (UTC+0)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { value: 'Europe/Paris', label: 'Париж (UTC+1)' },
  { value: 'Europe/Warsaw', label: 'Варшава (UTC+1)' },
  { value: 'Europe/Vilnius', label: 'Вильнюс (UTC+2)' },
  { value: 'Europe/Riga', label: 'Рига (UTC+2)' },
  { value: 'Europe/Tallinn', label: 'Таллинн (UTC+2)' },
  { value: 'Europe/Helsinki', label: 'Хельсинки (UTC+2)' },
  { value: 'Europe/Kyiv', label: 'Киев (UTC+2)' },
  { value: 'Europe/Bucharest', label: 'Бухарест (UTC+2)' },
  { value: 'Europe/Athens', label: 'Афины (UTC+2)' },
  { value: 'Africa/Cairo', label: 'Каир (UTC+2)' },
  { value: 'Africa/Johannesburg', label: 'Йоханнесбург (UTC+2)' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Istanbul', label: 'Стамбул (UTC+3)' },
  { value: 'Africa/Nairobi', label: 'Найроби (UTC+3)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Baku', label: 'Баку (UTC+4)' },
  { value: 'Asia/Yerevan', label: 'Ереван (UTC+4)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Karachi', label: 'Карачи (UTC+5)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Kolkata', label: 'Мумбаи (UTC+5:30)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Dhaka', label: 'Дакка (UTC+6)' },
  { value: 'Asia/Yangon', label: 'Янгон (UTC+6:30)' },
  { value: 'Asia/Bangkok', label: 'Бангкок (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Гонконг (UTC+8)' },
  { value: 'Asia/Singapore', label: 'Сингапур (UTC+8)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Australia/Perth', label: 'Перт (UTC+8)' },
  { value: 'Asia/Seoul', label: 'Сеул (UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+10)' },
  { value: 'Australia/Melbourne', label: 'Мельбурн (UTC+10)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Pacific/Auckland', label: 'Окленд (UTC+12)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
  { value: 'UTC', label: 'UTC' },
] as const;

const ALIASES: Record<string, string> = {
  'Europe/Kiev': 'Europe/Kyiv',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Rangoon': 'Asia/Yangon',
};

export function normalizeTimezone(tz: string): string {
  return ALIASES[tz] ?? tz;
}

export function timezoneLabel(tz: string): string {
  const normalized = normalizeTimezone(tz);
  return TIMEZONES.find((t) => t.value === normalized)?.label ?? normalized;
}

interface Props {
  visible: boolean;
  value: string;
  placeholder: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function TimezonePickerModal({ visible, value, placeholder, onSelect, onClose }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return TIMEZONES;
    return TIMEZONES.filter(
      (tz) => tz.label.toLowerCase().includes(q) || tz.value.toLowerCase().includes(q),
    );
  }, [query]);

  function handleSelect(tz: string) {
    onSelect(tz);
    setQuery('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Часовой пояс</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={colors.placeholder} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск…"
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = normalizeTimezone(value) === item.value;
            return (
              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => handleSelect(item.value)}
              >
                <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                  {item.label}
                </Text>
                {selected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      padding: 0,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    itemPressed: {
      backgroundColor: colors.muted,
    },
    itemText: {
      fontSize: 15,
      color: colors.foreground,
    },
    itemTextSelected: {
      color: colors.primary,
      fontWeight: '500',
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 20,
    },
  });
}
