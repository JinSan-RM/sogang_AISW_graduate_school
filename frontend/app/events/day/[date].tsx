import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { eventApi } from "../../../services/api";
import type { EventItem } from "../../../types";

const COLORS = {
  primary: "#2761FF",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#EEF0F3",
  bg: "#FFFFFF",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사일정",
  council: "원우회",
  event: "행사일정",
  exam: "시험일정",
  external: "외부일정",
  other: "일정",
};

const EVENT_CATEGORY_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  academic: { backgroundColor: "#EAF4FF", color: "#3478B8" },
  council: { backgroundColor: "#F1EAFE", color: "#6C4FCB" },
  event: { backgroundColor: "#FFF0F4", color: "#D65B7C" },
  exam: { backgroundColor: "#FFF5E8", color: "#B96B16" },
  external: { backgroundColor: "#EAF8F4", color: "#20856D" },
  other: { backgroundColor: "#F1F3F6", color: "#667085" },
};

function parseDateKey(value: string | string[] | undefined) {
  const dateKey = Array.isArray(value) ? value[0] : value;
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { date, dateKey };
}

function selectedDateLabel(date: Date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}(${WEEKDAYS[date.getDay()]})`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function EventRow({ item }: { item: EventItem }) {
  const categoryColors = EVENT_CATEGORY_COLORS[item.category] ?? EVENT_CATEGORY_COLORS.other;

  return (
    <Pressable onPress={() => router.push(`/events/${item.id}` as never)} style={styles.eventRow}>
      <View style={styles.eventTopRow}>
        <View style={[styles.categoryPill, { backgroundColor: categoryColors.backgroundColor }]}>
          <Text style={[styles.categoryText, { color: categoryColors.color }]}>
            {EVENT_CATEGORY_LABELS[item.category] ?? item.category}
          </Text>
        </View>
        <Text style={styles.eventTime}>{formatTime(item.start_at)}</Text>
      </View>
      <Text numberOfLines={2} style={styles.eventTitle}>
        {item.title}
      </Text>
    </Pressable>
  );
}

export default function EventDayScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const selectedDate = parseDateKey(params.date);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", "day", selectedDate?.dateKey],
    queryFn: () => eventApi.getEvents({ from_date: selectedDate!.dateKey, to_date: selectedDate!.dateKey }),
    enabled: Boolean(selectedDate),
  });
  const events = [...(data?.data ?? [])].sort((left, right) => +new Date(left.start_at) - +new Date(right.start_at));

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/home");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>일정</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isError || !selectedDate ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={34} color={COLORS.subtle} />
          <Text style={styles.emptyTitle}>일정을 불러오지 못했어요</Text>
          <Pressable onPress={() => void refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, events.length === 0 ? styles.emptyContent : null]}
          ListHeaderComponent={events.length ? <Text style={styles.dateLabel}>{selectedDateLabel(selectedDate.date)}</Text> : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={34} color="#AAB2BF" />
              <Text style={styles.emptyTitle}>이 날은 등록된 일정이 없어요</Text>
              <Text style={styles.emptyDescription}>다른 날짜를 선택해보세요</Text>
            </View>
          }
          renderItem={({ item }) => <EventRow item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  dateLabel: {
    color: COLORS.subtle,
    fontSize: 13,
    fontWeight: "700",
    paddingTop: 4,
    paddingBottom: 10,
  },
  eventRow: {
    minHeight: 86,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 14,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryPill: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "900",
  },
  eventTime: {
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: "700",
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 8,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 70,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 14,
  },
  emptyDescription: {
    color: COLORS.subtle,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 7,
  },
  retryButton: {
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
