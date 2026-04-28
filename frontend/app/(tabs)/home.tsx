import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

const COLORS = {
  navy: "#112d4e",
  blue: "#2563eb",
  red: "#b91c1c",
  bg: "#f4f7fb",
  border: "#dbe3ef",
  muted: "#64748b",
};

const HOME_MENUS = [
  { title: "게시판", subtitle: "공지, 자료, 활동 후기", icon: "list-outline", href: "/(tabs)/boards" },
  { title: "검색", subtitle: "앱 전체 게시글 찾기", icon: "search-outline", href: "/search" },
  { title: "일정", subtitle: "학사 및 학생회 일정", icon: "calendar-outline", href: "/events/calendar" },
  { title: "FAQ", subtitle: "자주 묻는 질문", icon: "help-circle-outline", href: "/faq" },
  { title: "커뮤니티", subtitle: "동아리, 스터디, 네트워킹", icon: "people-outline", href: "/(tabs)/community" },
  { title: "알림", subtitle: "내 알림 설정", icon: "notifications-outline", href: "/settings/notifications" },
] as const;

export default function HomeScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 36 }}>
      <View style={{ borderRadius: 8, backgroundColor: COLORS.navy, padding: 20 }}>
        <Text style={{ color: "#bfdbfe", fontSize: 12, fontWeight: "800", letterSpacing: 0 }}>SOGANG AI-SW</Text>
        <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "900", marginTop: 8 }}>AI-SW 커뮤니티</Text>
        <Text style={{ color: "#dbeafe", fontSize: 14, lineHeight: 21, marginTop: 8 }}>
          공지, 일정, 게시판, 알림을 한곳에서 확인하세요.
        </Text>
      </View>

      <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: COLORS.border, padding: 14 }}>
          <Text style={{ color: COLORS.red, fontSize: 20, fontWeight: "900" }}>P0</Text>
          <Text style={{ color: COLORS.muted, marginTop: 4 }}>핵심 화면 연결</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: COLORS.border, padding: 14 }}>
          <Text style={{ color: COLORS.blue, fontSize: 20, fontWeight: "900" }}>Phase 3</Text>
          <Text style={{ color: COLORS.muted, marginTop: 4 }}>개발 진행</Text>
        </View>
      </View>

      <Text style={{ color: COLORS.navy, fontSize: 18, fontWeight: "900", marginTop: 22, marginBottom: 10 }}>바로 가기</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {HOME_MENUS.map((menu) => (
          <Pressable
            key={menu.title}
            onPress={() => router.push(menu.href as never)}
            style={{
              width: "48%",
              minHeight: 118,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: "#ffffff",
              padding: 14,
            }}
          >
            <Ionicons name={menu.icon} size={24} color={COLORS.blue} />
            <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 12 }}>{menu.title}</Text>
            <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }}>{menu.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
