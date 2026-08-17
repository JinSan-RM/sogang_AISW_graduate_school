import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBoardsQuery } from "../../hooks/useApi";
import LoadingState from "../../components/LoadingState";
import NoticeRow, { type NoticeRowModel } from "../../components/NoticeRow";
import { useMultiBoardPosts } from "../../hooks/usePosts";
import type { Board } from "../../types";
import { formatBoardDate } from "../../utils/dateFormat";
import { NOTICES_TAB_ROUTE } from "../../utils/appRoutes";
import { noticeRefreshControlRefreshing, refreshQueries } from "../../utils/pullToRefresh";
import {
  isNoticeContentBoard,
  NOTICE_FILTERS,
  noticePostsForFilter,
  type NoticeFilter,
} from "../../utils/noticeFeed";

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

type IconName = keyof typeof Ionicons.glyphMap;

function flattenBoards(groups?: { boards: Board[] }[]) {
  return groups?.flatMap((group) => group.boards) ?? [];
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

function IconButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={24} color={COLORS.text} />
    </Pressable>
  );
}

function LoadingRows() {
  return <LoadingState compact />;
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={32} color="#AAB2BF" />
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

export default function NoticesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<NoticeFilter>("all");
  const { data: boardData, isLoading: boardsLoading, isError: boardsError, isRefetching: boardsRefetching, refetch: refetchBoards } = useBoardsQuery();

  const noticeBoards = useMemo(
    () =>
      flattenBoards(boardData?.data)
        .filter(isNoticeContentBoard)
        .sort((left, right) => left.sort_order - right.sort_order),
    [boardData?.data]
  );
  const noticeBoardIds = useMemo(() => noticeBoards.map((board) => board.id), [noticeBoards]);
  const postsQuery = useMultiBoardPosts(noticeBoardIds, {
    sort: "latest",
  });

  const realRows = useMemo<NoticeRowModel[]>(() => {
    return noticePostsForFilter(postsQuery.data ?? [], noticeBoards, selectedFilter).map(({ post, category }) => ({
        key: `post-${post.id}`,
        postId: post.id,
        title: post.title,
        category,
        date: [formatBoardDate(post.created_at), deadlineLabel(post.deadline_at)].filter(Boolean).join(" · "),
        isPinned: post.is_pinned,
      }));
  }, [noticeBoards, postsQuery.data, selectedFilter]);

  const isOfflinePreview = boardsError || postsQuery.isError || (!boardsLoading && noticeBoards.length === 0);
  const isLoading = boardsLoading || (noticeBoardIds.length > 0 && postsQuery.isLoading);
  const visibleRows = realRows;

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* 공지사항은 하단 탭 루트이므로 상단 뒤로가기 버튼을 비활성화합니다.
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
        */}
        <View style={styles.iconButton} />
        <Text style={styles.appBarTitle}>공지사항</Text>
        <IconButton icon="search-outline" label="검색" onPress={() => router.push("/search?scope=notices" as never)} />
      </View>

      <View style={styles.filterWrap}>
        {NOTICE_FILTERS.map((item) => {
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
            if (noticeBoardIds.length > 0) {
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

      <ScrollView
        style={styles.listScroller}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, !isLoading && visibleRows.length === 0 ? styles.listContentEmpty : null]}
        refreshControl={
          <RefreshControl
            refreshing={noticeRefreshControlRefreshing({
              boardsLoading,
              boardsRefetching,
              postsRefetching: postsQuery.isRefetching,
            })}
            onRefresh={() => {
              void refreshQueries([
                refetchBoards,
                noticeBoardIds.length > 0 ? postsQuery.refetch : undefined,
              ]);
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {isLoading ? <LoadingRows /> : null}
        {!isLoading && visibleRows.length > 0 ? (
          <View style={styles.list}>
            {visibleRows.map((item, index) => (
              <NoticeRow key={item.key} item={item} isLast={index === visibleRows.length - 1} returnTo={NOTICES_TAB_ROUTE} />
            ))}
          </View>
        ) : null}
        {!isLoading && visibleRows.length === 0 ? (
          <EmptyState
            title={isOfflinePreview ? "공지사항을 불러오지 못했습니다." : "등록된 공지가 없어요"}
            description={isOfflinePreview ? "잠시 후 다시 시도해주세요" : "새로운 공지가 등록되면 알려드릴게요"}
          />
        ) : null}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listScroller: {
    flex: 1,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  list: {
    backgroundColor: COLORS.surface,
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
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: "#2C3038",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
  },
  emptyDescription: {
    color: "#8A919C",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
});
