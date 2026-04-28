import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import BackButton from "../../components/BackButton";
import { eventApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사",
  council: "학생회",
  event: "행사",
  external: "외부",
};

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const eventId = Number(params.eventId);
  const user = useUserStore((state) => state.user);
  const { data, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventApi.getEvent(eventId),
  });

  const event = data?.data;

  if (isLoading || !event) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f7fb" }}>
        <ActivityIndicator />
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f7fb" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <BackButton fallback="/events/calendar" />
      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 18, marginTop: 12 }}>
        <Text style={{ color: event.color ?? "#2563eb", fontSize: 12, fontWeight: "900" }}>{EVENT_CATEGORY_LABELS[event.category] ?? event.category}</Text>
        <Text style={{ color: "#111827", fontSize: 26, fontWeight: "900", lineHeight: 32, marginTop: 8 }}>{event.title}</Text>

        <View style={{ gap: 10, marginTop: 18 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Ionicons name="time-outline" size={18} color="#2563eb" />
            <Text style={{ color: "#111827", flex: 1, lineHeight: 21 }}>
              {new Date(event.start_at).toLocaleString()}
              {event.end_at ? ` - ${new Date(event.end_at).toLocaleString()}` : ""}
            </Text>
          </View>
          {event.location ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ionicons name="location-outline" size={18} color="#2563eb" />
              <Text style={{ color: "#111827", flex: 1 }}>{event.location}</Text>
            </View>
          ) : null}
        </View>

        {event.description ? <Text style={{ color: "#111827", lineHeight: 24, marginTop: 18 }}>{event.description}</Text> : null}

        {user?.role === "admin" ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Pressable onPress={() => router.push({ pathname: "/admin", params: { editEventId: String(event.id) } })} style={{ flex: 1, alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 12 }}>
              <Text style={{ color: "#ffffff", fontWeight: "900" }}>수정</Text>
            </Pressable>
            <Pressable onPress={deleteEvent} style={{ flex: 1, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", paddingVertical: 12 }}>
              <Text style={{ color: "#b91c1c", fontWeight: "900" }}>삭제</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
