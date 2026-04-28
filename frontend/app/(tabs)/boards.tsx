import { router } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import BoardMenuItem from "../../components/BoardMenuItem";
import { useBoardsQuery } from "../../hooks/useApi";

const CATEGORY_LABEL: Record<string, string> = {
  notices: "공지",
  notice: "공지",
  community: "커뮤니티",
  resources: "자료",
  participation: "참여",
  council: "학생회",
  club: "동아리",
  study: "스터디",
  alumni: "선배",
  gsa: "학생회",
};

export default function BoardsScreen() {
  const { data, isLoading, isError } = useBoardsQuery();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f7fb" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const groups = data?.data ?? [];
  const totalBoards = groups.reduce((count, group) => count + group.boards.length, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f7fb" }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900", marginBottom: 6 }}>게시판</Text>
      <Text style={{ color: "#64748b", lineHeight: 20, marginBottom: 10 }}>
        서강 AI-SW의 모든 보드를 한곳에서 확인하세요.
      </Text>
      <Text style={{ color: "#2563eb", fontSize: 13, fontWeight: "900", marginBottom: 18 }}>
        전체 {totalBoards}개 보드
      </Text>

      {isError ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff7f7", padding: 16 }}>
          <Text style={{ color: "#b91c1c", fontWeight: "800" }}>게시판을 불러오지 못했습니다.</Text>
        </View>
      ) : null}

      {!isError && groups.length === 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 16 }}>
          <Text style={{ color: "#64748b" }}>표시할 게시판이 없습니다.</Text>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.category} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: "#112d4e", fontSize: 18, fontWeight: "900" }}>
              {CATEGORY_LABEL[group.category] ?? group.category}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "800" }}>{group.boards.length}개</Text>
          </View>
          {group.boards.map((board) => (
            <BoardMenuItem key={board.id} board={board} onPress={(item) => router.push(`/board/${item.id}`)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
