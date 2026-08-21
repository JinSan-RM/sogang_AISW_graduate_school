import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { Board } from "../../types";
import type { AdminBoardCapability, AdminBoardContentKind } from "../../utils/adminContentManagement";

export type AdminBoardContentPanelProps = {
  board?: Board;
  capability: AdminBoardCapability;
  renderers: Partial<Record<AdminBoardContentKind, () => ReactNode>>;
};

export type AdminBoardContentQueryPolicy = {
  isManagedContentActive: boolean;
  showsStandardPosts: boolean;
  noticeSource: "admin" | "public" | null;
  noticeBoardId?: number;
  showsSuggestions: boolean;
  showsMutualAid: boolean;
  showsActivityHistory: boolean;
};

export function adminBoardContentQueryPolicy({
  section,
  tab,
  kind,
  board,
}: {
  section: string;
  tab: "content" | "settings";
  kind: AdminBoardContentKind;
  board?: Board;
}): AdminBoardContentQueryPolicy {
  const isManagedContentActive = section === "boardManagement" && tab === "content";
  const managedStandardKinds: AdminBoardContentKind[] = [
    "aggregate-posts",
    "posts",
    "resource",
    "album",
    "activity-certification",
  ];
  const showsManagedNotice = isManagedContentActive && kind === "notice" && Boolean(board);
  return {
    isManagedContentActive,
    showsStandardPosts: section === "posts" || (isManagedContentActive && managedStandardKinds.includes(kind)),
    noticeSource: showsManagedNotice ? "admin" : ["notices", "banners"].includes(section) ? "public" : null,
    noticeBoardId: showsManagedNotice ? board?.id : undefined,
    showsSuggestions: section === "suggestions" || (isManagedContentActive && kind === "suggestion"),
    showsMutualAid: section === "mutualAid" || (isManagedContentActive && kind === "mutual-aid"),
    showsActivityHistory: isManagedContentActive && kind === "activity-history",
  };
}

export function noticeEditorBoardTransition(
  selectedBoardId: number | null,
  nextBoardId: number,
  editingBoardId: number | null,
) {
  return {
    selectedBoardId: nextBoardId,
    shouldResetEditor: selectedBoardId !== nextBoardId && editingBoardId !== nextBoardId,
  };
}

export function publicNoticeBoardSelection(boards: Board[], selectedBoardId: number | null) {
  const activeNoticeBoards = boards.filter(
    (board) => board.board_type === "notice" && board.is_active !== false,
  );
  if (activeNoticeBoards.some((board) => board.id === selectedBoardId)) return selectedBoardId;
  return activeNoticeBoards[0]?.id ?? null;
}

export function AdminBoardContentQueryState({
  isLoading,
  isError,
  isEmpty,
  emptyMessage,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  onRetry: () => void;
}) {
  const stateStyle = {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E4E9",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 8,
  } as const;
  if (isLoading) return <View style={stateStyle}><ActivityIndicator /></View>;
  if (isError) {
    return (
      <View style={stateStyle}>
        <Text style={{ color: "#D94343", fontWeight: "800" }}>콘텐츠를 불러오지 못했습니다.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="콘텐츠 다시 시도"
          onPress={onRetry}
          style={{ alignSelf: "flex-start", borderRadius: 6, backgroundColor: "#EDF2FE", paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ color: "#2761FF", fontWeight: "800" }}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }
  if (isEmpty) return <View style={stateStyle}><Text style={{ color: "#6B7280" }}>{emptyMessage}</Text></View>;
  return null;
}

export default function AdminBoardContentPanel({ board, capability, renderers }: AdminBoardContentPanelProps) {
  const render = renderers[capability.kind];
  if (render) return <>{render()}</>;
  return <Text>{board ? `${board.name} 콘텐츠를 관리할 수 없습니다.` : "표시할 콘텐츠가 없습니다."}</Text>;
}
