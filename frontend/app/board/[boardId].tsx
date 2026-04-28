import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useState } from "react";

import BackButton from "../../components/BackButton";
import PostCard from "../../components/PostCard";
import { useBoardPosts } from "../../hooks/usePosts";
import { useUserStore } from "../../stores/userStore";

const SORT_LABELS = {
  latest: "최신순",
  popular: "인기순",
  views: "조회순",
} as const;

export default function BoardPostsScreen() {
  const params = useLocalSearchParams<{ boardId: string }>();
  const boardId = Number(params.boardId);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "popular" | "views">("latest");
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBoardPosts(boardId, {
    q: query || undefined,
    sort,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f7fb" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f7fb" }}>
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: "#dbe3ef", backgroundColor: "#ffffff" }}>
        <View style={{ marginBottom: 10 }}>
          <BackButton fallback="/(tabs)/boards" />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            onChangeText={setQueryInput}
            placeholder="게시글 검색"
            style={{ flex: 1, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}
            value={queryInput}
          />
          <Pressable
            onPress={() => setQuery(queryInput.trim())}
            style={{ alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingHorizontal: 14 }}
          >
            <Ionicons name="search" size={19} color="#ffffff" />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {(["latest", "popular", "views"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setSort(item)}
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: sort === item ? "#2563eb" : "#dbe3ef",
                backgroundColor: sort === item ? "#eff6ff" : "#ffffff",
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: sort === item ? "#2563eb" : "#64748b", fontWeight: "800" }}>{SORT_LABELS[item]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 90 }}
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={{ margin: 16, padding: 22, borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#dbe3ef" }}>
            <Text style={{ color: "#64748b" }}>게시글이 없습니다.</Text>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} onPress={(postId) => router.push(`/board/post/${postId}`)} />}
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
      />

      <Pressable
        onPress={() =>
          isAuthenticated
            ? router.push({ pathname: "/board/post/create", params: { boardId: String(boardId) } })
            : router.push("/auth/login")
        }
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          width: 56,
          height: 56,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 28,
          backgroundColor: "#2563eb",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}
