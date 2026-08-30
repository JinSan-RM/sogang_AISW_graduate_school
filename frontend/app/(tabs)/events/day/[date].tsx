import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LoadingState from "../../../../components/LoadingState";
import { eventApi } from "../../../../services/api";
import type { EventItem } from "../../../../types";
import { eventDayBackDecision } from "../../../../utils/appRoutes";
import { formatBoardDate, formatTime24 } from "../../../../utils/dateFormat";

import { BackIcon, EmptyCalendarIcon } from "../../../../components/icons";
const COLORS = {
  primary: "#2761FF",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#EAECEF",
  bg: "#FFFFFF",
};

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사일정",
  event: "행사일정",
  other: "기타일정",
};

const EVENT_CATEGORY_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  academic: { backgroundColor: "#E6F1FB", color: "#0C447C" },
  council: { backgroundColor: "#F1EAFE", color: "#6C4FCB" },
  event: { backgroundColor: "#FBEAF0", color: "#993556" },
  exam: { backgroundColor: "#FFF5E8", color: "#B96B16" },
  external: { backgroundColor: "#EAF8F4", color: "#20856D" },
  other: { backgroundColor: "#EDE8F6", color: "#4A2B7A" },
};

function parseDateKey(value: string | string[] | undefined) {
  const dateKey = Array.isArray(value) ? value[0] : value;
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { date, dateKey };
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
        <Text style={styles.eventTime}>{formatTime24(item.start_at)}</Text>
      </View>
      <Text numberOfLines={2} style={styles.eventTitle}>
        {item.title}
      </Text>
    </Pressable>
  );
}

export default function EventDayScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string | string[]; returnTo?: string | string[] }>();
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
            const decision = eventDayBackDecision(params.returnTo, router.canGoBack());
            if (decision.action === "navigate") router.navigate(decision.route as never);
            else if (decision.action === "back") router.back();
            else router.replace(decision.route as never);
          }}
          style={styles.iconButton}
        >
          <BackIcon size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>일정</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <LoadingState />
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
          ListHeaderComponent={events.length ? <Text style={styles.dateLabel}>{formatBoardDate(selectedDate.dateKey)}</Text> : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <EmptyCalendarIcon size={32} />
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
    paddingHorizontal: 16,
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
    fontWeight: "500",
    lineHeight: 22,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  dateLabel: {
    color: COLORS.subtle,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  eventRow: {
    borderBottomWidth: 1, // Figma 항목: 1px #EAECEF, padding 16/0, gap 6
    borderBottomColor: COLORS.border,
    paddingVertical: 16,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11, // Figma: Regular 11/13
    fontWeight: "400",
    lineHeight: 13,
  },
  eventTime: {
    color: "#A6ACB7", // Figma: Regular 12/15
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 15,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 15, // Figma: Regular 15/18
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 6,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 70,
  },
  emptyTitle: {
    color: "#2C3038",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
    marginTop: 8,
  },
  emptyDescription: {
    color: "#8A919C",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 8,
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
