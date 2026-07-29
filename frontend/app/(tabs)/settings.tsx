import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMeQuery } from "../../hooks/useApi";
import MediaImage from "../../components/MediaImage";
import { authApi, notificationApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import { clearStoredPushToken, getStoredPushToken } from "../../utils/pushTokenStorage";
import { isAdminUser } from "../../utils/permissions";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  primary100: "#D5E0FE",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#A6ACB7",
  border: "#E1E4E9",
  avatar: "#EAF4FF",
  bg: "#FFFFFF",
  danger: "#E24B4A",
};

type IconName = keyof typeof Ionicons.glyphMap;

const MENU_ITEMS = [
  { title: "내가 쓴 글", href: "/settings/activity?type=posts" },
  { title: "스크랩한 글", href: "/settings/activity?type=bookmarks" },
  { title: "알림 설정", href: "/settings/notifications" },
  { title: "계정 및 데이터 삭제", href: "/settings/account" },
] as const;

const ADMIN_QUICK_ITEMS: { title: string; href: string; icon: IconName }[] = [
  { title: "배너 관리", href: "/admin?section=banners", icon: "albums-outline" },
  { title: "공지사항 관리", href: "/admin?section=notices", icon: "megaphone-outline" },
  { title: "원우회 관리", href: "/admin?section=boards&scope=council", icon: "people-circle-outline" },
  { title: "전체 게시글", href: "/admin?section=posts", icon: "document-text-outline" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isError, isLoading, refetch } = useMeQuery();
  const refreshToken = useUserStore((state) => state.refreshToken);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const clearSession = useUserStore((state) => state.clearSession);
  const me = data?.data;
  const hasProfileImage = Boolean(me?.profile_image_media_id || me?.profile_image_url);

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
        {isError ? (
          <Pressable accessibilityRole="button" onPress={() => void refetch()} style={styles.loadErrorBox}>
            <Text style={styles.loadErrorText}>프로필을 불러오지 못했습니다. 다시 시도</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.push("/settings/profile")} style={styles.profileRow}>
          {isLoading ? (
            <View style={styles.avatar}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : hasProfileImage ? (
            <MediaImage
              media={{ id: me?.profile_image_media_id, url: me?.profile_image_url }}
              style={styles.avatarImage}
            />
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
          <Ionicons name="chevron-forward" size={15} color={COLORS.subtle} />
        </Pressable>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <Pressable key={item.title} onPress={() => router.push(item.href as never)} style={styles.menuRow}>
              <Text style={styles.menuText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={15} color={COLORS.subtle} />
            </Pressable>
          ))}
        </View>

        {isAdminUser(me) ? (
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

        {isAuthenticated ? (
          <Pressable onPress={logout} style={styles.logoutRow}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
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
    paddingHorizontal: 16,
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
    fontWeight: "500",
  },
  scroller: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  loadErrorBox: {
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: COLORS.avatar,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.avatar,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "500",
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "500",
  },
  profileMeta: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "400",
    marginTop: 3,
  },
  menuList: {
    marginTop: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
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
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 8,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "400",
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
