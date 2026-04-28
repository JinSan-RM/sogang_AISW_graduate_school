import { router } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import BoardMenuItem from "../../components/BoardMenuItem";
import { useBoardsQuery } from "../../hooks/useApi";

const COMMUNITY_CATEGORIES = ["community", "resources", "participation", "council", "alumni", "club", "study"];

const CATEGORY_LABELS: Record<string, string> = {
  community: "커뮤니티",
  resources: "자료 공유",
  participation: "참여 활동",
  council: "학생회",
  alumni: "선배와의 만남",
  club: "동아리",
  study: "스터디",
};

export default function CommunityScreen() {
  const { data, isLoading, isError } = useBoardsQuery();
  const groups = (data?.data ?? []).filter((group) => COMMUNITY_CATEGORIES.includes(group.category));

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f7fb" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f7fb" }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900", marginBottom: 6 }}>커뮤니티</Text>
      <Text style={{ color: "#64748b", lineHeight: 20, marginBottom: 18 }}>
        활동 인증, 자료 공유, 제안과 학생회 게시판을 모아봤습니다.
      </Text>

      {isError ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff7f7", padding: 16 }}>
          <Text style={{ color: "#b91c1c", fontWeight: "800" }}>커뮤니티 게시판을 불러오지 못했습니다.</Text>
        </View>
      ) : null}

      {!isError && groups.length === 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 16 }}>
          <Text style={{ color: "#64748b" }}>표시할 커뮤니티 게시판이 없습니다.</Text>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.category} style={{ marginBottom: 20 }}>
          <Text style={{ color: "#112d4e", fontSize: 18, fontWeight: "900", marginBottom: 10 }}>
            {CATEGORY_LABELS[group.category] ?? group.category}
          </Text>
          {group.boards.map((board) => (
            <BoardMenuItem key={board.id} board={board} onPress={(item) => router.push(`/board/${item.id}`)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
