import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { eventApi } from "../../services/api";
import type { EventItem } from "../../types";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#EEF0F3",
  bg: "#FFFFFF",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사",
  council: "원우회",
  event: "행사",
  external: "외부",
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start: dateKey(start), end: dateKey(end) };
}

function monthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildMonthCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: { key: string; day?: number }[] = [];
  for (let index = 0; index < firstDay; index += 1) {
    cells.push({ key: `blank-${index}` });
  }
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push({ key: `day-${day}`, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-${cells.length}` });
  }
  return cells;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function EventRow({ item }: { item: EventItem }) {
  return (
    <Pressable onPress={() => router.push(`/events/${item.id}` as never)} style={styles.eventRow}>
      <Text style={styles.categoryText}>{EVENT_CATEGORY_LABELS[item.category] ?? item.category}</Text>
      <Text numberOfLines={2} style={styles.eventTitle}>
        {item.title}
      </Text>
      <Text style={styles.eventMeta}>{formatTime(item.start_at)}</Text>
    </Pressable>
  );
}

export default function EventCalendarScreen() {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const range = useMemo(() => monthRange(currentMonth), [currentMonth]);
  const { data, isLoading } = useQuery({
    queryKey: ["events", range.start, range.end],
    queryFn: () => eventApi.getEvents({ from_date: range.start, to_date: range.end }),
  });

  const events = data?.data ?? [];
  const selectedEvents = events.filter((event) => {
    const date = new Date(event.start_at);
    return !Number.isNaN(date.getTime()) && date.getDate() === selectedDay;
  });
  const cells = buildMonthCells(currentMonth);

  const changeMonth = (delta: number) => {
    setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + delta, 1));
    setSelectedDay(1);
  };

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

      <View style={styles.monthHeader}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.monthButton}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(currentMonth)}</Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.monthButton}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.calendarGrid}>
            {WEEKDAYS.map((day, index) => (
              <Text key={day} style={[styles.weekday, index === 0 ? styles.sunday : null]}>
                {day}
              </Text>
            ))}
            {cells.map((cell) => {
              const hasEvent = cell.day ? events.some((event) => new Date(event.start_at).getDate() === cell.day) : false;
              const selected = selectedDay === cell.day;
              return (
                <Pressable
                  key={cell.key}
                  disabled={!cell.day}
                  onPress={() => cell.day && setSelectedDay(cell.day)}
                  style={styles.dayCell}
                >
                  {cell.day ? (
                    <View style={[styles.dayBadge, selected ? styles.dayBadgeActive : hasEvent ? styles.dayBadgeMarked : null]}>
                      <Text style={[styles.dayText, selected ? styles.dayTextActive : null]}>{cell.day}</Text>
                      {hasEvent ? <View style={[styles.dot, selected ? styles.dotActive : null]} /> : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.listTitle}>{selectedDay}일 일정</Text>
          <FlatList
            data={selectedEvents}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>선택한 날짜에 일정이 없습니다.</Text>
              </View>
            }
            renderItem={({ item }) => <EventRow item={item} />}
          />
        </View>
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
    backgroundColor: COLORS.bg,
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
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  monthButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 18,
  },
  weekday: {
    width: "14.285%",
    color: COLORS.subtle,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  sunday: {
    color: "#D75D76",
  },
  dayCell: {
    width: "14.285%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadge: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  dayBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  dayBadgeMarked: {
    backgroundColor: COLORS.primary50,
  },
  dayText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  dayTextActive: {
    color: "#FFFFFF",
  },
  dot: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  listTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 8,
  },
  eventRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 13,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 6,
  },
  eventMeta: {
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  emptyBox: {
    paddingVertical: 18,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "800",
  },
});
