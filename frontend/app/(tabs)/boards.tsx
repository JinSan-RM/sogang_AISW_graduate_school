import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import BoardMenuItem from "../../components/BoardMenuItem";
import LoadingState from "../../components/LoadingState";
import { useBoardsQuery } from "../../hooks/useApi";

const CATEGORY_LABEL: Record<string, string> = {
  notices: "공지",
  notice: "공지",
  community: "커뮤니티",
  resources: "자료",
  participation: "참여",
  council: "원우회",
  club: "동아리",
  study: "스터디",
  alumni: "선배",
  gsa: "대학원 원우회",
};

const TEXT = {
  title: "게시판",
  description: "AI·SW CAMPUS의 모든 보드를 한곳에서 확인하세요.",
  loadError: "게시판을 불러오지 못했습니다.",
  empty: "표시할 게시판이 없습니다.",
  totalBoards: (count: number) => `전체 ${count}개 보드`,
  countSuffix: (count: number) => `${count}개`,
};

export default function BoardsScreen() {
  const { data, isLoading, isError } = useBoardsQuery();

  if (isLoading) {
    return <LoadingState />;
  }

  const groups = data?.data ?? [];
  const totalBoards = groups.reduce((count, group) => count + group.boards.length, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f7fb" }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900", marginBottom: 6 }}>{TEXT.title}</Text>
      <Text style={{ color: "#64748b", lineHeight: 20, marginBottom: 10 }}>
        {TEXT.description}
      </Text>
      <Text style={{ color: "#2563eb", fontSize: 13, fontWeight: "900", marginBottom: 18 }}>
        {TEXT.totalBoards(totalBoards)}
      </Text>

      {isError ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff7f7", padding: 16 }}>
          <Text style={{ color: "#b91c1c", fontWeight: "800" }}>{TEXT.loadError}</Text>
        </View>
      ) : null}

      {!isError && groups.length === 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 16 }}>
          <Text style={{ color: "#64748b" }}>{TEXT.empty}</Text>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.category} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: "#112d4e", fontSize: 18, fontWeight: "900" }}>
              {CATEGORY_LABEL[group.category] ?? group.category}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "800" }}>{TEXT.countSuffix(group.boards.length)}</Text>
          </View>
          {group.boards.map((board) => (
            <BoardMenuItem key={board.id} board={board} onPress={(item) => router.push(`/board/${item.id}`)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
