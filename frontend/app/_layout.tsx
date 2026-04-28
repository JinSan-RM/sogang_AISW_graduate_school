import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";

import NotificationBootstrap from "../components/NotificationBootstrap";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationBootstrap />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { color: "#112d4e", fontWeight: "800" },
          contentStyle: { backgroundColor: "#f4f7fb" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ title: "로그인" }} />
      <Stack.Screen name="auth/register" options={{ title: "회원가입" }} />
      <Stack.Screen name="auth/password-reset" options={{ title: "비밀번호 재설정" }} />
      <Stack.Screen name="search" options={{ title: "검색" }} />
      <Stack.Screen name="events" options={{ title: "일정" }} />
      <Stack.Screen name="events/calendar" options={{ title: "캘린더" }} />
      <Stack.Screen name="events/[eventId]" options={{ title: "일정 상세" }} />
        <Stack.Screen name="faq" options={{ title: "FAQ" }} />
      <Stack.Screen name="settings/notifications" options={{ title: "알림" }} />
      <Stack.Screen name="settings/profile" options={{ title: "프로필" }} />
      <Stack.Screen name="settings/account" options={{ title: "계정" }} />
      <Stack.Screen name="settings/activity" options={{ title: "내 활동" }} />
      <Stack.Screen name="admin/index" options={{ title: "관리자" }} />
      <Stack.Screen name="board/[boardId]" options={{ title: "게시판" }} />
      <Stack.Screen name="board/post/[postId]" options={{ title: "게시글" }} />
      <Stack.Screen name="board/post/create" options={{ title: "글쓰기" }} />
      <Stack.Screen name="board/post/edit/[postId]" options={{ title: "게시글 수정" }} />
      </Stack>
    </QueryClientProvider>
  );
}
