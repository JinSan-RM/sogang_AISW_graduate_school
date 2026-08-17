import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMeQuery } from "../hooks/useApi";
import MediaImage from "./MediaImage";
import { authApi, notificationApi } from "../services/api";
import { useUserStore } from "../stores/userStore";
import { navigateBackToMyPageDrawer } from "../utils/myPageNavigation";
import { clearStoredPushToken, getStoredPushToken } from "../utils/pushTokenStorage";

import { BackIcon, DefaultAvatarIcon } from "./icons";
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
  backdrop: "rgba(17,24,39,0.24)",
};

const MENU_ITEMS = [
  { title: "내가 쓴 글", href: "/settings/activity?type=posts" },
  { title: "스크랩한 글", href: "/settings/activity?type=bookmarks" },
  { title: "알림 설정", href: "/settings/notifications" },
  { title: "계정 설정", href: "/settings/account" },
] as const;

type MyPageDrawerContextValue = {
  openDrawer: () => void;
  closeDrawer: () => void;
  returnToDrawer: () => void;
};

const MyPageDrawerContext = createContext<MyPageDrawerContextValue | null>(null);

export function useMyPageDrawer() {
  const context = useContext(MyPageDrawerContext);
  if (!context) {
    throw new Error("useMyPageDrawer must be used within MyPageDrawerProvider");
  }
  return context;
}

export function MyPageDrawerProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data } = useMeQuery();
  const refreshToken = useUserStore((state) => state.refreshToken);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const clearSession = useUserStore((state) => state.clearSession);
  const [isVisible, setIsVisible] = useState(false);
  const drawerWidth = width;
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const returningToDrawerRef = useRef(false);
  const me = data?.data;
  const hasProfileImage = Boolean(me?.profile_image_media_id || me?.profile_image_url);

  useEffect(() => {
    if (!isVisible) {
      translateX.setValue(-drawerWidth);
    }
  }, [drawerWidth, isVisible, translateX]);

  const closeDrawer = useCallback(() => {
    Animated.timing(translateX, {
      toValue: -drawerWidth,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setIsVisible(false));
  }, [drawerWidth, translateX]);

  const openDrawer = useCallback(() => {
    if (!isAuthenticated) {
      router.push("/auth/login" as never);
      return;
    }
    setIsVisible(true);
    translateX.setValue(-drawerWidth);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 210,
      useNativeDriver: true,
    }).start();
  }, [drawerWidth, isAuthenticated, translateX]);

  const returnToDrawer = useCallback(() => {
    if (returningToDrawerRef.current) return;
    returningToDrawerRef.current = true;
    navigateBackToMyPageDrawer(
      {
        canGoBack: () => router.canGoBack(),
        back: () => router.back(),
        replace: (route) => router.replace(route as never),
      },
      () => {
        openDrawer();
        returningToDrawerRef.current = false;
      },
    );
  }, [openDrawer]);

  const navigateTo = (href: string) => {
    closeDrawer();
    setTimeout(() => router.push(href as never), 170);
  };

  const logout = async () => {
    closeDrawer();
    const pushToken = await getStoredPushToken().catch(() => null);
    if (pushToken) {
      await notificationApi.deactivatePushToken({ token: pushToken, platform: Platform.OS }).catch(() => undefined);
      await clearStoredPushToken().catch(() => undefined);
    }
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    clearSession();
    setTimeout(() => router.replace("/auth/login" as never), 170);
  };

  const edgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isVisible,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isVisible && gesture.dx > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 36) {
            openDrawer();
          }
        },
      }),
    [isVisible, openDrawer]
  );

  const drawerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          isVisible && gesture.dx < -12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -48) {
            closeDrawer();
          }
        },
      }),
    [closeDrawer, isVisible]
  );

  const backdropOpacity = translateX.interpolate({
    inputRange: [-drawerWidth, 0],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const contextValue = useMemo(
    () => ({ openDrawer, closeDrawer, returnToDrawer }),
    [closeDrawer, openDrawer, returnToDrawer],
  );

  return (
    <MyPageDrawerContext.Provider value={contextValue}>
      <View style={styles.host}>
        {children}
        {!isVisible ? <View pointerEvents="box-only" style={styles.edgeSwipeArea} {...edgePanResponder.panHandlers} /> : null}
        {isVisible ? (
          <View pointerEvents="box-none" style={styles.overlay}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
              <Pressable accessibilityLabel="마이페이지 닫기" onPress={closeDrawer} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View
              style={[
                styles.drawer,
                {
                  width: "100%",
                  paddingTop: Math.max(insets.top, 10),
                  transform: [{ translateX }],
                },
              ]}
              {...drawerPanResponder.panHandlers}
            >
              <View style={styles.appBar}>
                <Pressable accessibilityLabel="닫기" onPress={closeDrawer} style={styles.iconButton}>
                  <BackIcon size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.appBarTitle}>마이페이지</Text>
                <View style={styles.iconButton} />
              </View>

              <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
                <Pressable onPress={() => navigateTo("/settings/profile")} style={styles.profileRow}>
                  {hasProfileImage ? (
                    <MediaImage
                      media={{ id: me?.profile_image_media_id, url: me?.profile_image_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <DefaultAvatarIcon size={52} />
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
                    <Pressable key={item.title} onPress={() => navigateTo(item.href)} style={styles.menuRow}>
                      <Text style={styles.menuText}>{item.title}</Text>
                      <Ionicons name="chevron-forward" size={15} color={COLORS.subtle} />
                    </Pressable>
                  ))}
                </View>

                <Pressable onPress={logout} style={styles.logoutRow}>
                  <Text style={styles.logoutText}>로그아웃</Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </MyPageDrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  edgeSwipeArea: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 24,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.001)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.backdrop,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
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
});
