import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LoadingState from "../components/LoadingState";
import { eventApi } from "../services/api";
import type { EventItem } from "../types";
import { formatBoardDateTime } from "../utils/dateFormat";

import { BackIcon } from "../components/icons";
const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#EEF0F3",
  bg: "#FFFFFF",
};

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사일정",
  council: "원우회",
  event: "행사",
  exam: "시험",
  external: "외부",
  other: "일정",
};

function EventRow({ item }: { item: EventItem }) {
  return (
    <Pressable onPress={() => router.push(`/events/${item.id}` as never)} style={styles.eventRow}>
      <View style={styles.categoryPill}>
        <Text style={styles.categoryText}>{EVENT_CATEGORY_LABELS[item.category] ?? item.category}</Text>
      </View>
      <Text numberOfLines={2} style={styles.eventTitle}>
        {item.title}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={15} color={COLORS.subtle} />
        <Text style={styles.metaText}>{formatBoardDateTime(item.start_at)}</Text>
      </View>
      {item.location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color={COLORS.subtle} />
          <Text numberOfLines={1} style={styles.metaText}>
            {item.location}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", "list"],
    queryFn: () => eventApi.getEvents(),
  });
  const events = data?.data ?? [];

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
          <BackIcon size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>일정</Text>
        <Pressable accessibilityLabel="캘린더" onPress={() => router.push("/events/calendar")} style={styles.iconButton}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          onRefresh={refetch}
          refreshing={false}
          contentContainerStyle={[styles.listContent, events.length === 0 ? styles.emptyContent : null]}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{isError ? "일정을 불러오지 못했습니다." : "등록된 일정이 없습니다."}</Text>
              {isError ? <Text style={styles.emptyText}>당겨서 새로고침해 다시 시도해주세요.</Text> : null}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  eventRow: {
    minHeight: 112,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 15,
  },
  categoryPill: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },
  metaText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 7,
  },
});
