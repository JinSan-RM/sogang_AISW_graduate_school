import { Pressable, ScrollView, Text, View } from "react-native";

import {
  adminBoardsForScope,
  type AdminBoardManagementTab,
  type AdminContentScope,
} from "../../utils/adminContentManagement";
import type { Board } from "../../types";

export type AdminBoardManagementNavigatorProps = {
  boards: Board[];
  scope: AdminContentScope;
  selectedBoardId: number | null;
  selectedTab: AdminBoardManagementTab;
  creatingBoard: boolean;
  onScopeChange: (scope: AdminContentScope) => void;
  onBoardChange: (boardId: number | null) => void;
  onTabChange: (tab: AdminBoardManagementTab) => void;
  onCreateBoard: () => void;
};

const SCOPE_OPTIONS: { key: AdminContentScope; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "notices", label: "공지사항" },
  { key: "community", label: "커뮤니티·자료" },
  { key: "participation", label: "참여활동" },
  { key: "council", label: "원우회" },
];

const TABS: { key: AdminBoardManagementTab; label: string }[] = [
  { key: "content", label: "콘텐츠" },
  { key: "settings", label: "운영 설정" },
];

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        borderRadius: 6,
        borderWidth: 1,
        borderColor: selected ? "#2761FF" : "#E1E4E9",
        backgroundColor: selected ? "#EDF2FE" : "#ffffff",
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <Text style={{ color: selected ? "#2761FF" : "#374151", fontSize: 13, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

export default function AdminBoardManagementNavigator({
  boards,
  scope,
  selectedBoardId,
  selectedTab,
  creatingBoard,
  onScopeChange,
  onBoardChange,
  onTabChange,
  onCreateBoard,
}: AdminBoardManagementNavigatorProps) {
  const visibleBoards = adminBoardsForScope(boards, scope);
  const tabs = creatingBoard
    ? TABS.filter((tab) => tab.key === "settings")
    : selectedBoardId !== null
      ? TABS
      : TABS.filter((tab) => tab.key === "content");

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 7 }}>
        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "900" }}>그룹</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {SCOPE_OPTIONS.map((option) => (
            <TabButton
              key={option.key}
              label={option.label}
              selected={scope === option.key}
              onPress={() => onScopeChange(option.key)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 7 }}>
        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "900" }}>게시판</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {scope === "all" ? (
            <TabButton label="모든 게시판" selected={!creatingBoard && selectedBoardId === null} onPress={() => onBoardChange(null)} />
          ) : null}
          {visibleBoards.map((board) => (
            <TabButton
              key={board.id}
              label={board.name}
              selected={!creatingBoard && selectedBoardId === board.id}
              onPress={() => onBoardChange(board.id)}
            />
          ))}
          {visibleBoards.length === 0 && scope !== "all" ? (
            <Text style={{ color: "#6B7280", paddingVertical: 9 }}>등록된 게시판이 없습니다.</Text>
          ) : null}
        </ScrollView>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              label={tab.label}
              selected={selectedTab === tab.key}
              onPress={() => onTabChange(tab.key)}
            />
          ))}
        </View>
        <Pressable
          onPress={onCreateBoard}
          style={{ borderRadius: 6, borderWidth: 1, borderColor: "#C7CDD4", paddingHorizontal: 12, paddingVertical: 9 }}
        >
          <Text style={{ color: "#374151", fontSize: 12, fontWeight: "900" }}>고급 설정 · 새 게시판 등록</Text>
        </Pressable>
      </View>
    </View>
  );
}
