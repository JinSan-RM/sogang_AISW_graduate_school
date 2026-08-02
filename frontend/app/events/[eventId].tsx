import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LoadingState from "../../components/LoadingState";
import { eventApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import { formatBoardDateTime } from "../../utils/dateFormat";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#E1E4E9",
  bg: "#FFFFFF",
  danger: "#B91C1C",
};

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사일정",
  council: "원우회일정",
  event: "행사일정",
  exam: "시험일정",
  external: "외부일정",
  other: "기타일정",
};

const EVENT_CATEGORY_TONES: Record<string, { backgroundColor: string; color: string }> = {
  academic: { backgroundColor: "#E6F1FB", color: "#0C447C" },
  council: { backgroundColor: "#F1EAFE", color: "#6C4FCB" },
  event: { backgroundColor: "#FFF0F4", color: "#D65B7C" },
  exam: { backgroundColor: "#FFF5E8", color: "#B96B16" },
  external: { backgroundColor: "#EAF8F4", color: "#20856D" },
  other: { backgroundColor: "#F1F3F6", color: "#667085" },
};

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const eventId = Number(params.eventId);
  const user = useUserStore((state) => state.user);
  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Number.isInteger(eventId) && eventId > 0,
  });

  const event = data?.data;

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>일정을 불러오지 못했습니다.</Text>
        <Pressable accessibilityRole="button" onPress={() => void refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  const deleteEvent = async () => {
    try {
      await eventApi.deleteEvent(event.id);
      Alert.alert("삭제 완료", "일정이 삭제되었습니다.");
      router.replace("/events/calendar");
    } catch {
      Alert.alert("삭제 실패", "일정을 삭제하지 못했습니다.");
    }
  };
  const categoryTone = EVENT_CATEGORY_TONES[event.category] ?? EVENT_CATEGORY_TONES.other;

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/events/calendar");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>일정</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
        <View style={[styles.categoryPill, { backgroundColor: categoryTone.backgroundColor }]}>
          <Text style={[styles.categoryText, { color: categoryTone.color }]}>{EVENT_CATEGORY_LABELS[event.category] ?? event.category}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.muted} />
          <Text style={styles.metaText}>{formatBoardDateTime(event.start_at)}</Text>
        </View>

        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.divider} />

        {event.description ? <Text style={styles.body}>{event.description}</Text> : null}
        {event.location ? <Text style={styles.body}>장소: {event.location}</Text> : null}
        {event.end_at ? <Text style={styles.body}>종료: {formatBoardDateTime(event.end_at)}</Text> : null}

        {user?.role === "admin" ? (
          <View style={styles.adminActions}>
            <Pressable onPress={() => router.push({ pathname: "/admin", params: { editEventId: String(event.id) } })} style={styles.adminButton}>
              <Text style={styles.adminButtonText}>수정</Text>
            </Pressable>
            <Pressable onPress={deleteEvent} style={[styles.adminButton, styles.deleteButton]}>
              <Text style={styles.deleteButtonText}>삭제</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.bg,
  },
  errorText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  retryButton: {
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
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
  },
  scroller: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 40,
  },
  categoryPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "400",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 28,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 16,
    marginBottom: 16,
  },
  body: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 23,
    marginBottom: 16,
  },
  adminActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  adminButton: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  adminButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontWeight: "900",
  },
});
