import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMeQuery } from "../../hooks/useApi";
import { API_ORIGIN, authApi, notificationApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import { clearStoredPushToken, getStoredPushToken } from "../../utils/pushTokenStorage";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  primary100: "#D5E0FE",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#9AA3B2",
  border: "#EEF0F3",
  avatar: "#EAF4FF",
  bg: "#FFFFFF",
  danger: "#FF6B6B",
};

type IconName = keyof typeof Ionicons.glyphMap;

const MENU_ITEMS = [
  { title: "내가 쓴 글", href: "/settings/activity?type=posts" },
  { title: "스크랩한 글", href: "/settings/activity?type=bookmarks" },
  { title: "알림 설정", href: "/settings/notifications" },
  { title: "계정 설정", href: "/settings/account" },
] as const;

const ADMIN_QUICK_ITEMS: { title: string; href: string; icon: IconName }[] = [
  { title: "배너 관리", href: "/admin?section=banners", icon: "albums-outline" },
  { title: "공지사항 관리", href: "/admin?section=notices", icon: "megaphone-outline" },
  { title: "원우회 관리", href: "/admin?section=boards&scope=council", icon: "people-circle-outline" },
  { title: "전체 게시글", href: "/admin?section=posts", icon: "document-text-outline" },
];

function mediaUrl(value?: string | null) {
  if (!value) return null;
  return value.startsWith("http") ? value : `${API_ORIGIN}${value}`;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useMeQuery();
  const refreshToken = useUserStore((state) => state.refreshToken);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const clearSession = useUserStore((state) => state.clearSession);
  const me = data?.data;
  const image = mediaUrl(me?.profile_image_url);

  const logout = async () => {
    const pushToken = await getStoredPushToken().catch(() => null);
    if (pushToken) {
      await notificationApi.deactivatePushToken({ token: pushToken, platform: Platform.OS }).catch(() => undefined);
      await clearStoredPushToken().catch(() => undefined);
    }
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    clearSession();
    router.replace("/auth/login");
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/home");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>마이페이지</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.push("/settings/profile")} style={styles.profileRow}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{me?.nickname?.slice(0, 1) ?? "?"}</Text>
            </View>
          )}
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{me?.nickname ?? "로그인이 필요합니다"}</Text>
            <Text style={styles.profileMeta}>
              {[me?.major, me?.cohort ? `${me.cohort}기` : null].filter(Boolean).join(" · ") || me?.email || ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
        </Pressable>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <Pressable key={item.title} onPress={() => router.push(item.href as never)} style={styles.menuRow}>
              <Text style={styles.menuText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
            </Pressable>
          ))}
        </View>

        {isAuthenticated ? (
          <>
            {me?.role === "admin" ? (
              <View style={styles.adminPanel}>
                <Pressable onPress={() => router.push("/admin" as never)} style={styles.adminEntry}>
                  <View style={styles.adminIcon}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
                  </View>
                  <View style={styles.adminTextWrap}>
                    <Text style={styles.adminTitle}>관리자 페이지</Text>
                    <Text style={styles.adminSubtitle}>배너, 공지사항, 게시판 설정</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </Pressable>
                {ADMIN_QUICK_ITEMS.map((item) => (
                  <Pressable key={item.title} onPress={() => router.push(item.href as never)} style={styles.adminQuickRow}>
                    <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                    <Text style={styles.adminQuickText}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.subtle} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Pressable onPress={logout} style={styles.logoutRow}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={() => router.push("/auth/login")} style={styles.loginButton}>
            <Text style={styles.loginText}>로그인</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  scroller: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  profileRow: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  avatar: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: COLORS.avatar,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.avatar,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  profileMeta: {
    color: COLORS.subtle,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  menuList: {
    marginTop: 22,
  },
  menuRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 24,
  },
  menuText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  adminPanel: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.primary100,
    borderRadius: 8,
    backgroundColor: "#F8FAFF",
    marginHorizontal: 24,
    marginTop: 18,
  },
  adminEntry: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary100,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  adminIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary50,
  },
  adminTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  adminTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  adminSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  adminQuickRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 14,
  },
  adminQuickText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  logoutRow: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 20,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "900",
  },
  loginButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginHorizontal: 24,
    marginTop: 24,
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
