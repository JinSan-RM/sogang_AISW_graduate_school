import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBoardsQuery } from "../../hooks/useApi";
import { useBoardPosts } from "../../hooks/usePosts";
import type { Board, PostListItem } from "../../types";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  primary100: "#D5E0FE",
  text: "#15171C",
  navy: "#0B1F56",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#E1E4E9",
  divider: "#EEF0F3",
  surface: "#FFFFFF",
  page: "#FFFFFF",
  danger: "#B91C1C",
  danger50: "#FFF1F2",
  pink50: "#FFEAF1",
  pink700: "#B91C4C",
  cyan50: "#E6F9FB",
  cyan700: "#14788A",
};

type NoticeFilter = "all" | "academic" | "event" | "other";
type IconName = keyof typeof Ionicons.glyphMap;

type NoticeRowModel = {
  key: string;
  postId?: number;
  title: string;
  category: string;
  date: string;
  isPinned?: boolean;
};

const FILTERS: { key: NoticeFilter; label: string; slugs: string[] }[] = [
  { key: "all", label: "전체", slugs: ["all-notices", "academic-notices", "event-notices", "webinar-notices"] },
  { key: "academic", label: "학사공지", slugs: ["academic-notices", "academic-calendar"] },
  { key: "event", label: "행사공지", slugs: ["event-notices", "webinar-notices"] },
  { key: "other", label: "기타공지", slugs: ["all-notices"] },
];

function flattenBoards(groups?: { boards: Board[] }[]) {
  return groups?.flatMap((group) => group.boards) ?? [];
}

function isNoticeBoard(board: Board) {
  return board.category === "notices" || board.board_type === "notice" || board.slug.includes("notice");
}

function findBoardForFilter(boards: Board[], filter: NoticeFilter) {
  const filterConfig = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];
  for (const slug of filterConfig.slugs) {
    const board = boards.find((item) => item.slug === slug);
    if (board) {
      return board;
    }
  }
  return filter === "all" ? boards[0] : undefined;
}

function formatNoticeDate(value?: string | null) {
  if (!value) {
    return "";
  }
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  const date = new Date(value.includes("T") && !hasTimezone ? `${value}Z` : value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(2, 10).replace(/-/g, ".");
  }
  const year = String(date.getFullYear()).slice(2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${year}.${month}.${day}(${weekday})`;
}

function deadlineLabel(value?: string | null) {
  if (!value) return "";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((targetDay.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "마감";
  if (days === 0) return "마감 D-day";
  return `마감 D-${days}`;
}

function normalizeNoticeCategory(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const rawCategory = trimmed.toLowerCase();
  if (rawCategory.includes("event") || rawCategory.includes("행사")) {
    return "행사공지";
  }
  if (rawCategory.includes("webinar") || rawCategory.includes("특강")) {
    return "특강공지";
  }
  if (rawCategory.includes("academic") || rawCategory.includes("학사") || rawCategory.includes("calendar")) {
    return "학사공지";
  }
  if (rawCategory.includes("all") || rawCategory.includes("전체")) {
    return "기타공지";
  }
  if (rawCategory.includes("other") || rawCategory.includes("general") || rawCategory.includes("기타")) {
    return "기타공지";
  }
  return trimmed.length <= 8 ? trimmed : "공지";
}

function categoryFromPost(post: PostListItem, board?: Board, filter?: NoticeFilter) {
  const explicitCategory = normalizeNoticeCategory(post.category);
  if (explicitCategory) {
    return explicitCategory;
  }
  if (filter === "academic") {
    return "학사공지";
  }
  if (filter === "event") {
    return "행사공지";
  }
  if (filter === "other") {
    return "기타공지";
  }
  return normalizeNoticeCategory(board?.slug) ?? "기타공지";
}

function rowTone(category: string) {
  if (category.includes("행사")) {
    return { backgroundColor: "#FBEAF0", color: "#993556" };
  }
  if (category.includes("특강")) {
    return { backgroundColor: COLORS.cyan50, color: COLORS.cyan700 };
  }
  if (category.includes("기타")) {
    return { backgroundColor: "#F0EEF9", color: "#5A4C8B" };
  }
  return { backgroundColor: "#E6F1FB", color: "#0C447C" };
}

function IconButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={24} color={COLORS.text} />
    </Pressable>
  );
}

function NoticeRow({ item }: { item: NoticeRowModel }) {
  const tone = rowTone(item.category);
  const handlePress = item.postId ? () => router.push(`/board/post/${item.postId}` as never) : undefined;

  return (
    <Pressable disabled={!handlePress} onPress={handlePress} style={[styles.noticeRow, item.isPinned ? styles.noticeRowPinned : null]}>
      <View style={styles.noticeMain}>
        <View style={styles.metaRow}>
          {item.isPinned ? <Ionicons name="pin" size={11} color="#5A4C8B" /> : null}
          <View style={[styles.categoryPill, { backgroundColor: tone.backgroundColor }]}>
            <Text style={[styles.categoryText, { color: tone.color }]}>{item.category}</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={[styles.noticeTitle, item.isPinned ? styles.noticeTitlePinned : null]}>
          {item.title}
        </Text>
        <Text style={styles.noticeDate}>{item.date}</Text>
      </View>
    </Pressable>
  );
}

function LoadingRows() {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator color={COLORS.primary} />
      <Text style={styles.loadingText}>공지 데이터를 불러오는 중입니다.</Text>
    </View>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={24} color={COLORS.subtle} />
      <Text style={styles.emptyTitle}>{title}</Text>
    </View>
  );
}

export default function NoticesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<NoticeFilter>("all");
  const { data: boardData, isLoading: boardsLoading, isError: boardsError, isFetching: boardsFetching, refetch: refetchBoards } = useBoardsQuery();

  const noticeBoards = useMemo(
    () =>
      flattenBoards(boardData?.data)
        .filter(isNoticeBoard)
        .filter((board) => board.is_active !== false)
        .sort((left, right) => left.sort_order - right.sort_order),
    [boardData?.data]
  );
  const selectedBoard = useMemo(() => findBoardForFilter(noticeBoards, selectedFilter), [noticeBoards, selectedFilter]);
  const postsQuery = useBoardPosts(selectedBoard?.id ?? 0, {
    sort: "latest",
    category: selectedFilter === "other" ? "other" : undefined,
  });

  const realRows = useMemo<NoticeRowModel[]>(() => {
    const posts = postsQuery.data?.pages.flatMap((page) => page.data) ?? [];
    return posts.map((post) => ({
      key: `post-${post.id}`,
      postId: post.id,
      title: post.title,
      category: categoryFromPost(post, selectedBoard, selectedFilter),
      date: [formatNoticeDate(post.created_at), deadlineLabel(post.deadline_at)].filter(Boolean).join(" · "),
      isPinned: post.is_pinned,
    }));
  }, [postsQuery.data?.pages, selectedBoard, selectedFilter]);

  const isOfflinePreview = boardsError || postsQuery.isError || (!boardsLoading && noticeBoards.length === 0);
  const isLoading = boardsLoading || (Boolean(selectedBoard?.id) && postsQuery.isLoading);
  const visibleRows = realRows;

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <IconButton
          icon="chevron-back"
          label="뒤로"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/(tabs)/home" as never);
          }}
        />
        <Text style={styles.appBarTitle}>공지사항</Text>
        <IconButton icon="search-outline" label="검색" onPress={() => router.push("/search?scope=notices" as never)} />
      </View>

      <View style={styles.filterWrap}>
        {FILTERS.map((item) => {
          const active = selectedFilter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setSelectedFilter(item.key)}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isOfflinePreview ? (
        <Pressable
          onPress={() => {
            void refetchBoards();
            if (selectedBoard?.id) {
              void postsQuery.refetch();
            }
          }}
          style={styles.connectionStrip}
        >
          <Ionicons name="cloud-offline-outline" size={16} color={COLORS.danger} />
          <Text numberOfLines={1} style={styles.connectionText}>
            데이터 서버 연결 필요 · 탭하면 다시 시도
          </Text>
        </Pressable>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {isLoading ? <LoadingRows /> : null}
        {!isLoading && visibleRows.length > 0 ? (
          <View style={styles.list}>
            {visibleRows.map((item) => (
              <NoticeRow key={item.key} item={item} />
            ))}
          </View>
        ) : null}
        {!isLoading && visibleRows.length === 0 ? (
          <EmptyState title={isOfflinePreview ? "공지사항을 불러오지 못했습니다." : "등록된 공지가 없습니다."} />
        ) : null}
      </ScrollView>

      {boardsFetching && !boardsLoading ? (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },
  appBarTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "500",
  },
  filterWrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
  },
  filterChip: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: "#E1E4E9",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: "#15171C",
    borderColor: "#15171C",
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  connectionStrip: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
    backgroundColor: COLORS.danger50,
    paddingHorizontal: 24,
  },
  connectionText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  list: {
    backgroundColor: COLORS.surface,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 14,
  },
  noticeRowPinned: {
    borderBottomWidth: 0,
    borderRadius: 12,
    backgroundColor: "#EEF0F3",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  noticeMain: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 24,
  },
  categoryPill: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "400",
  },
  noticeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    marginTop: 6,
  },
  noticeTitlePinned: {
    fontWeight: "500",
  },
  noticeDate: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "400",
    marginTop: 6,
  },
  loadingWrap: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "900",
  },
  refreshIndicator: {
    position: "absolute",
    right: 24,
    bottom: 18,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
});
