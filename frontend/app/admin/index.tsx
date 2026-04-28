import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useEffect } from "react";
import { z } from "zod";

import BackButton from "../../components/BackButton";
import { eventApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";

const eventSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  start_at: z.string().min(1),
  end_at: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;

const emptyEvent: EventForm = {
  title: "",
  category: "event",
  start_at: "",
  end_at: "",
  location: "",
  description: "",
};

const FIELD_PLACEHOLDERS: Record<keyof EventForm, string> = {
  title: "일정 제목",
  category: "분류 예: event, academic, council",
  start_at: "시작일 예: 2026-06-01T09:00",
  end_at: "종료일 예: 2026-06-01T11:00",
  location: "장소",
  description: "상세 설명",
};

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사",
  council: "학생회",
  event: "행사",
  external: "외부",
};

export default function AdminScreen() {
  const params = useLocalSearchParams<{ editEventId?: string }>();
  const editEventId = params.editEventId ? Number(params.editEventId) : null;
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();
  const { data: eventsRes, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => eventApi.getEvents(),
    enabled: user?.role === "admin",
  });
  const { data: editEventRes } = useQuery({
    queryKey: ["event", editEventId],
    queryFn: () => eventApi.getEvent(editEventId ?? 0),
    enabled: user?.role === "admin" && Boolean(editEventId),
  });

  const { control, handleSubmit, reset } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: emptyEvent,
  });

  useEffect(() => {
    const event = editEventRes?.data;
    if (!event) {
      return;
    }
    reset({
      title: event.title,
      category: event.category,
      start_at: event.start_at.slice(0, 16),
      end_at: event.end_at?.slice(0, 16) ?? "",
      location: event.location ?? "",
      description: event.description ?? "",
    });
  }, [editEventRes?.data, reset]);

  if (user?.role !== "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: "#f4f7fb", padding: 16 }}>
        <BackButton fallback="/(tabs)/settings" />
        <View style={{ marginTop: 16, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff7f7", padding: 18 }}>
          <Text style={{ color: "#b91c1c", fontSize: 18, fontWeight: "900" }}>관리자 권한이 필요합니다</Text>
          <Text style={{ color: "#64748b", lineHeight: 21, marginTop: 8 }}>이 화면은 관리자 API 권한으로만 사용할 수 있습니다.</Text>
        </View>
      </View>
    );
  }

  const events = eventsRes?.data ?? [];

  const onSubmit = async (values: EventForm) => {
    const payload = {
      title: values.title,
      category: values.category,
      start_at: new Date(values.start_at).toISOString(),
      end_at: values.end_at ? new Date(values.end_at).toISOString() : undefined,
      location: values.location?.trim() || undefined,
      description: values.description?.trim() || undefined,
    };

    try {
      if (editEventId) {
        await eventApi.updateEvent(editEventId, payload);
        Alert.alert("일정 수정", "일정이 수정되었습니다.");
        router.replace("/admin");
      } else {
        await eventApi.createEvent(payload);
        Alert.alert("일정 등록", "일정이 등록되었습니다.");
      }
      reset(emptyEvent);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch {
      Alert.alert("저장 실패", "입력 정보를 다시 확인하세요.");
    }
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#f4f7fb" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={events}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 16 }}>
          <BackButton fallback="/(tabs)/settings" />
          <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>관리자</Text>

          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 14, gap: 10 }}>
            <Text style={{ color: "#112d4e", fontSize: 18, fontWeight: "900" }}>{editEventId ? "일정 수정" : "일정 등록"}</Text>
            {(["title", "category", "start_at", "end_at", "location", "description"] as const).map((name) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field }) => (
                  <TextInput
                    multiline={name === "description"}
                    onChangeText={field.onChange}
                    placeholder={FIELD_PLACEHOLDERS[name]}
                    style={{
                      minHeight: name === "description" ? 86 : undefined,
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                      borderRadius: 8,
                      backgroundColor: "#ffffff",
                      padding: 12,
                      textAlignVertical: name === "description" ? "top" : "center",
                    }}
                    value={field.value}
                  />
                )}
              />
            ))}
            <Pressable onPress={handleSubmit(onSubmit)} style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 12 }}>
              <Text style={{ color: "#ffffff", fontWeight: "900" }}>{editEventId ? "수정 완료" : "일정 등록"}</Text>
            </Pressable>
          </View>

          <Text style={{ color: "#112d4e", fontSize: 18, fontWeight: "900" }}>일정 목록</Text>
          {isLoading ? <ActivityIndicator /> : null}
        </View>
      }
      ListEmptyComponent={
        isLoading ? null : (
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 18 }}>
            <Text style={{ color: "#64748b" }}>등록된 일정이 없습니다.</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/events/${item.id}`)}
          style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 14, marginBottom: 10 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="calendar-outline" size={18} color="#2563eb" />
            <Text style={{ color: "#2563eb", fontSize: 12, fontWeight: "900" }}>{EVENT_CATEGORY_LABELS[item.category] ?? item.category}</Text>
          </View>
          <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 6 }}>{item.title}</Text>
          <Text style={{ color: "#64748b", marginTop: 4 }}>{new Date(item.start_at).toLocaleString()}</Text>
        </Pressable>
      )}
    />
  );
}
