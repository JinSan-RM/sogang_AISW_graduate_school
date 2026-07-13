import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { userApi } from "../../services/api";
import type { UserActivityItem } from "../../types";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#EEF0F3",
  bg: "#FFFFFF",
};

const FILTERS = [
  { label: "내가 쓴 글", value: "posts" },
  { label: "댓글 단 글", value: "comments" },
  { label: "스크랩한 글", value: "bookmarks" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10).replace(/-/g, ".");
  return `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeType(value?: string | string[]): FilterValue {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "comments" || raw === "bookmarks" || raw === "posts" ? raw : "posts";
}

function itemLabel(item: UserActivityItem) {
  if (item.type === "bookmark") return "스크랩";
  if (item.type === "comment") return "댓글";
  return "게시글";
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<FilterValue>(() => normalizeType(params.type));
  const { data, isLoading, isError, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["activity", type],
    queryFn: ({ pageParam }) => userApi.getActivity({ type, page: pageParam, size: 30 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination && lastPage.pagination.page < lastPage.pagination.total_pages
        ? lastPage.pagination.page + 1
        : undefined,
  });

  useEffect(() => {
    setType(normalizeType(params.type));
  }, [params.type]);

  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const title = FILTERS.find((item) => item.value === type)?.label ?? "내 활동";

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/settings");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>{title}</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          onRefresh={refetch}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          refreshing={isRefetching}
          contentContainerStyle={[styles.listContent, items.length === 0 ? styles.emptyContent : null]}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{isError ? "활동을 불러오지 못했습니다. 당겨서 다시 시도해주세요." : "표시할 활동이 없습니다."}</Text>
            </View>
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 18 }} /> : null}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/board/post/${item.post_id}` as never)} style={styles.row}>
              <View style={styles.rowText}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{item.board_name ?? itemLabel(item)}</Text>
                </View>
                <Text numberOfLines={2} style={styles.title}>
                  {item.title}
                </Text>
                {item.content_preview ? (
                  <Text numberOfLines={2} style={styles.preview}>
                    {item.content_preview}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {shortDate(item.created_at)} · 댓글 {item.comment_count ?? 0} · 추천 {item.like_count ?? 0}
                </Text>
              </View>
              {item.type === "bookmark" ? <Ionicons name="bookmark" size={18} color={COLORS.primary} /> : null}
            </Pressable>
          )}
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  filterChip: {
    height: 34,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    paddingHorizontal: 13,
  },
  filterChipActive: {
    borderColor: COLORS.text,
    backgroundColor: COLORS.text,
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  row: {
    minHeight: 102,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 7,
  },
  preview: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
  },
  meta: {
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
});
