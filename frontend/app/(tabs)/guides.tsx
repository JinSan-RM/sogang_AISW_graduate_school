import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";

import BackButton from "../../components/BackButton";

const COLORS = {
  navy: "#112d4e",
  blue: "#2563eb",
  bg: "#f4f7fb",
  border: "#dbe3ef",
  text: "#111827",
  muted: "#64748b",
};

const GUIDE_SECTIONS = [
  {
    title: "원우회 로드맵",
    icon: "map-outline",
    items: ["학기 초 온보딩과 커뮤니티 안내", "동아리·스터디 모집과 활동 인증", "세미나, 네트워킹, 선배와의 만남 운영"],
  },
  {
    title: "원우회비 혜택",
    icon: "card-outline",
    items: ["원우회 주관 행사와 네트워킹 지원", "스터디·동아리 활동 인증 및 공지", "상조회와 원우회 운영 안내"],
  },
  {
    title: "동아리/스터디",
    icon: "people-outline",
    items: ["모집 글 확인 후 지원 신청 게시판 이용", "활동 인증 게시판에 결과와 사진 기록", "모집, 홍보, 지원 내역은 게시판에서 검색 가능"],
  },
  {
    title: "동문 네트워킹",
    icon: "briefcase-outline",
    items: ["동문 주소록 안내 확인", "채용 정보와 커리어 자료 공유", "선배와의 만남 및 웨비나 공지 확인"],
  },
] as const;

export default function GuidesScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <BackButton fallback="/(tabs)/home" />
      <Text style={{ color: COLORS.navy, fontSize: 24, fontWeight: "900", marginTop: 12 }}>로드맵 & 원우회비 혜택</Text>
      <Text style={{ color: COLORS.muted, lineHeight: 20, marginTop: 6 }}>
        원우회 활동, 혜택, 참여 흐름을 한곳에서 확인합니다.
      </Text>

      <View style={{ gap: 12, marginTop: 16 }}>
        {GUIDE_SECTIONS.map((section) => (
          <View key={section.title} style={{ borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#ffffff", padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#eff6ff" }}>
                <Ionicons name={section.icon} size={20} color={COLORS.blue} />
              </View>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "900" }}>{section.title}</Text>
            </View>
            <View style={{ gap: 8, marginTop: 12 }}>
              {section.items.map((item) => (
                <View key={item} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.blue, marginTop: 8 }} />
                  <Text style={{ flex: 1, color: COLORS.muted, lineHeight: 21 }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
