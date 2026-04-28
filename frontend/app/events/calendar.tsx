import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useMemo, useState } from "react";

import BackButton from "../../components/BackButton";
import { eventApi } from "../../services/api";

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  academic: "학사",
  council: "학생회",
  event: "행사",
  external: "외부",
};

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

function daysInMonth(date: Date) {
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => index + 1);
}

export default function EventCalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const range = useMemo(() => monthRange(currentMonth), [currentMonth]);
  const { data, isLoading } = useQuery({
    queryKey: ["events", range.start, range.end],
    queryFn: () => eventApi.getEvents({ from_date: range.start, to_date: range.end }),
  });

  const events = data?.data ?? [];
  const selectedEvents = events.filter((event) => new Date(event.start_at).getDate() === selectedDay);

  const changeMonth = (delta: number) => {
    setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + delta, 1));
    setSelectedDay(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f7fb" }}>
      <View style={{ padding: 16, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#dbe3ef" }}>
        <BackButton fallback="/(tabs)/home" />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <Pressable onPress={() => changeMonth(-1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={22} color="#112d4e" />
          </Pressable>
          <Text style={{ color: "#112d4e", fontSize: 22, fontWeight: "900" }}>
            {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </Text>
          <Pressable onPress={() => changeMonth(1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={22} color="#112d4e" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {daysInMonth(currentMonth).map((day) => {
              const hasEvent = events.some((event) => new Date(event.start_at).getDate() === day);
              const selected = selectedDay === day;
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={{
                    width: "13.2%",
                    aspectRatio: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selected ? "#2563eb" : "#dbe3ef",
                    backgroundColor: selected ? "#eff6ff" : "#ffffff",
                  }}
                >
                  <Text style={{ color: selected ? "#2563eb" : "#111827", fontWeight: "900" }}>{day}</Text>
                  {hasEvent ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#0f766e", marginTop: 3 }} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: "#112d4e", fontSize: 18, fontWeight: "900", marginTop: 18, marginBottom: 10 }}>
            {selectedDay}일 일정
          </Text>
          <FlatList
            data={selectedEvents}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 18 }}>
                <Text style={{ color: "#64748b" }}>선택한 날짜에 일정이 없습니다.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/events/${item.id}`)}
                style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 14, marginBottom: 10 }}
              >
                <Text style={{ color: "#2563eb", fontSize: 12, fontWeight: "900" }}>{EVENT_CATEGORY_LABELS[item.category] ?? item.category}</Text>
                <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 5 }}>{item.title}</Text>
                <Text style={{ color: "#64748b", marginTop: 4 }}>{new Date(item.start_at).toLocaleTimeString()}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}
