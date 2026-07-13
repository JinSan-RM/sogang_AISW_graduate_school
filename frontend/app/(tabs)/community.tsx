import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import BoardPostsScreen from "../board/[boardId]";
import { useBoardsQuery } from "../../hooks/useApi";

const COLORS = {
  primary: "#2761FF",
  text: "#111827",
  muted: "#6B7280",
  bg: "#FFFFFF",
};

export default function CommunityScreen() {
  const { data, isLoading, isError } = useBoardsQuery();
  const boards = data?.data.flatMap((group) => group.boards) ?? [];
  const initialBoard =
    boards.find((board) => board.slug === "event-album") ??
    boards.find((board) => board.slug === "lecture-reviews") ??
    boards.find((board) => board.board_type === "resource");

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.message}>커뮤니티를 불러오는 중입니다.</Text>
      </View>
    );
  }

  if (!initialBoard) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{isError ? "커뮤니티를 불러오지 못했습니다." : "연결된 커뮤니티 게시판이 없습니다."}</Text>
        <Text style={styles.message}>게시판 시드와 서버 연결 상태를 확인해주세요.</Text>
      </View>
    );
  }

  return <BoardPostsScreen initialBoardId={initialBoard.id} isTabRoot />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
