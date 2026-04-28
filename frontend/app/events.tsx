import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { eventApi } from "../services/api";
import type { EventItem } from "../types";
import BackButton from "../components/BackButton";

export default function EventsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    eventApi.getEvents().then((response) => setEvents(response.data));
  }, []);

  return (
    <View style={{ padding: 16 }}>
      <BackButton />
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>일정</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={<Text>등록된 일정이 없습니다.</Text>}
        renderItem={({ item }) => (
          <View style={{ borderBottomWidth: 1, paddingVertical: 12 }}>
            <Text style={{ fontWeight: "700" }}>{item.title}</Text>
            <Text>{new Date(item.start_at).toLocaleString()}</Text>
            {item.location ? <Text>{item.location}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}
