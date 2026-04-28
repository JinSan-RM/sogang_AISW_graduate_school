import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useMeQuery } from "../../hooks/useApi";
import { authApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";

const MENU_ITEMS = [
  { title: "프로필", subtitle: "닉네임, 기수, 연락처", icon: "person-outline", href: "/settings/profile" },
  { title: "계정", subtitle: "비밀번호 및 계정 상태", icon: "shield-checkmark-outline", href: "/settings/account" },
  { title: "알림", subtitle: "댓글, 좋아요, 공지, 일정 알림", icon: "notifications-outline", href: "/settings/notifications" },
  { title: "내 활동", subtitle: "게시글, 댓글, 북마크", icon: "time-outline", href: "/settings/activity" },
] as const;

export default function SettingsScreen() {
  const { data } = useMeQuery();
  const refreshToken = useUserStore((state) => state.refreshToken);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const clearSession = useUserStore((state) => state.clearSession);
  const me = data?.data;

  const logout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    clearSession();
    router.replace("/auth/login");
  };

  return (
    <View style={{ flex: 1, gap: 14, backgroundColor: "#f4f7fb", padding: 16 }}>
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>설정</Text>
      <View style={{ borderRadius: 8, backgroundColor: "#112d4e", padding: 16 }}>
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>{me?.nickname ?? "로그인이 필요합니다"}</Text>
        <Text style={{ color: "#bfdbfe", marginTop: 4 }}>{me?.email ?? ""}</Text>
          {me?.cohort ? <Text style={{ color: "#dbeafe", marginTop: 6 }}> {me.cohort}기</Text> : null}
      </View>

      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.title}
          onPress={() => router.push(item.href as never)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#dbe3ef",
            backgroundColor: "#ffffff",
            padding: 14,
          }}
        >
          <Ionicons name={item.icon} size={22} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900" }}>{item.title}</Text>
            <Text style={{ color: "#64748b", marginTop: 3 }}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </Pressable>
      ))}

      {isAuthenticated ? (
        <>
          {me?.role === "admin" ? (
            <Pressable onPress={() => router.push("/admin")} style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#0f766e", paddingVertical: 12 }}>
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>관리자</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={logout} style={{ alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", paddingVertical: 12 }}>
            <Text style={{ color: "#b91c1c", fontWeight: "900" }}>로그아웃</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => router.push("/auth/login")} style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 12 }}>
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>로그인</Text>
        </Pressable>
      )}
      <Text style={{ color: "#94a3b8", textAlign: "center" }}>버전 0.1.0</Text>
    </View>
  );
}
