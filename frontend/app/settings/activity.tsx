import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useState } from "react";

import BackButton from "../../components/BackButton";
import { userApi } from "../../services/api";

const FILTERS = [
  { label: "게시글", value: "posts" },
  { label: "댓글", value: "comments" },
  { label: "북마크", value: "bookmarks" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  post: "게시글",
  comment: "댓글",
  bookmark: "북마크",
};

export default function ActivityScreen() {
  const [type, setType] = useState<(typeof FILTERS)[number]["value"]>("posts");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["activity", type],
    queryFn: () => userApi.getActivity({ type, page: 1, size: 50 }),
  });

  const items = data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f7fb" }}>
      <View style={{ padding: 16, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#dbe3ef" }}>
        <BackButton fallback="/(tabs)/settings" />
        <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900", marginTop: 12 }}>내 활동</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          {FILTERS.map((filter) => (
            <Pressable
              key={filter.value}
              onPress={() => setType(filter.value)}
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: type === filter.value ? "#2563eb" : "#dbe3ef",
                backgroundColor: type === filter.value ? "#eff6ff" : "#ffffff",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: type === filter.value ? "#2563eb" : "#64748b", fontWeight: "900" }}>{filter.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 20 }}>
              <Text style={{ color: "#64748b" }}>표시할 활동이 없습니다.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/board/post/${item.post_id}`)}
              style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 14, marginBottom: 10 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons
                  name={item.type === "post" ? "document-text-outline" : item.type === "comment" ? "chatbubble-outline" : "bookmark-outline"}
                  size={18}
                  color="#2563eb"
                />
                <Text style={{ color: "#2563eb", fontSize: 12, fontWeight: "900" }}>{TYPE_LABELS[item.type] ?? item.type}</Text>
                <Text style={{ color: "#94a3b8", fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
              <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 8 }} numberOfLines={1}>
                {item.title}
              </Text>
              {item.content_preview ? (
                <Text style={{ color: "#64748b", lineHeight: 20, marginTop: 4 }} numberOfLines={2}>
                  {item.content_preview}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
