import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMeQuery } from "../../hooks/useApi";
import { userApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import { clearStoredPushToken } from "../../utils/pushTokenStorage";

const COLORS = {
  primary: "#2761FF",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#A6ACB7",
  border: "#E1E4E9",
  bg: "#FFFFFF",
  danger: "#E24B4A",
};

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useMeQuery();
  const clearSession = useUserStore((state) => state.clearSession);
  const me = data?.data;

  const deactivate = () => {
    Alert.alert("회원 탈퇴", "계정을 비활성화하면 다시 로그인할 수 없습니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: async () => {
          try {
            await userApi.deactivateMe({ reason: "user_requested" });
            await clearStoredPushToken().catch(() => undefined);
            clearSession();
            Alert.alert("계정 비활성화 완료", "계정이 비활성화되었습니다.");
            router.replace("/auth/login");
          } catch {
            Alert.alert("비활성화 실패", "잠시 후 다시 시도해주세요.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/settings");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>계정 설정</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
        <View style={styles.menuList}>
          <Pressable onPress={() => router.push("/settings/password")} style={styles.menuRow}>
            <Text style={styles.menuText}>비밀번호 변경</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.subtle} />
          </Pressable>
          <Pressable
            onPress={() => Alert.alert("학교 이메일 인증 정보", me?.email ? `${me.email}\n인증된 학교 이메일입니다.` : "인증 정보를 불러오는 중입니다.")}
            style={styles.menuRow}
          >
            <Text style={styles.menuText}>학교 이메일 인증 정보</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.subtle} />
          </Pressable>
          <Pressable onPress={() => router.push("/legal/privacy")} style={styles.menuRow}>
            <Text style={styles.menuText}>개인정보 수집 및 이용 동의</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.subtle} />
          </Pressable>
        </View>
        <View style={styles.deactivateWrap}>
          <Pressable onPress={deactivate} style={styles.deactivateRow}>
            <Text style={styles.dangerText}>회원 탈퇴</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  appBarTitle: { color: COLORS.text, fontSize: 18, fontWeight: "500" },
  scroller: { flex: 1 },
  content: { paddingBottom: 36 },
  menuList: { paddingTop: 4, paddingHorizontal: 16 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 13,
  },
  menuText: { color: COLORS.text, fontSize: 14, fontWeight: "400" },
  deactivateWrap: { paddingTop: 8, paddingHorizontal: 16 },
  deactivateRow: { paddingVertical: 13 },
  dangerText: { color: COLORS.danger, fontSize: 14, fontWeight: "400" },
});
