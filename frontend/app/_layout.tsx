import { useFonts } from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";

import NotificationBootstrap from "../components/NotificationBootstrap";
import { useUserStore } from "../stores/userStore";
import { INTER_FONTS, patchDefaultFontFamily } from "../utils/fonts";
import { isAdminUser } from "../utils/permissions";

// Route every <Text>/<TextInput> through the matching Inter face (design uses Inter).
patchDefaultFontFamily();

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts(INTER_FONTS);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const user = useUserStore((state) => state.user);
  const isAdmin = isAdminUser(user);
  const isWeb = Platform.OS === "web";
  const useWebFrame = isWeb && width > 430;

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  if (!hasHydrated || !fontsLoaded) {
    return <View style={styles.viewport} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={[styles.viewport, useWebFrame ? styles.webViewport : null]}>
        <View style={[styles.appShell, useWebFrame ? styles.webAppShell : null]}>
          <NotificationBootstrap />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#ffffff" },
              headerTitleStyle: { color: "#111827", fontWeight: "900" },
              contentStyle: { backgroundColor: "#FFFFFF" },
            }}
          >
            <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
            <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
            <Stack.Screen name="legal/account-deletion" options={{ headerShown: false }} />
            <Stack.Screen name="legal/support" options={{ headerShown: false }} />
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/register" options={{ headerShown: false }} />
              <Stack.Screen name="auth/password-reset" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="search" options={{ headerShown: false }} />
              <Stack.Screen name="events" options={{ headerShown: false }} />
              <Stack.Screen name="events/calendar" options={{ headerShown: false }} />
              <Stack.Screen name="events/day/[date]" options={{ headerShown: false }} />
              <Stack.Screen name="events/[eventId]" options={{ headerShown: false }} />
              <Stack.Screen name="faq" options={{ headerShown: false }} />
              <Stack.Screen name="guides" options={{ title: "가이드" }} />
              <Stack.Screen name="notifications" options={{ headerShown: false }} />
              <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
              <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
              <Stack.Screen name="settings/account" options={{ headerShown: false }} />
              <Stack.Screen name="settings/password" options={{ headerShown: false }} />
              <Stack.Screen name="settings/email-verification" options={{ headerShown: false }} />
              <Stack.Screen name="settings/activity" options={{ headerShown: false }} />
              <Stack.Screen name="settings/blocks" options={{ title: "차단 관리" }} />
              <Stack.Screen name="board/[boardId]" options={{ headerShown: false }} />
              <Stack.Screen name="board/post/[postId]" options={{ headerShown: false }} />
              <Stack.Screen name="board/post/create" options={{ headerShown: false }} />
              <Stack.Screen name="board/post/edit/[postId]" options={{ headerShown: false }} />
              <Stack.Screen name="council/mutual-aid-complete" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={isAdmin}>
              <Stack.Screen name="admin/index" options={{ title: "관리자" }} />
            </Stack.Protected>
          </Stack>
        </View>
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  webViewport: {
    alignItems: "center",
    backgroundColor: "#ECEFF5",
  },
  appShell: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
  },
  webAppShell: {
    maxWidth: 405,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E1E4E9",
  },
});
