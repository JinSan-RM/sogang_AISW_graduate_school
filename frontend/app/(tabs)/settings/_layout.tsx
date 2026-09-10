import { Stack } from "expo-router";

// 설정(마이페이지) 하위 화면을 탭 그룹 안의 스택으로 묶어 하단 탭바가 유지되게 한다.
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* The drawer covers these screens until layout; reveal them fully in place. */}
      <Stack.Screen name="profile" options={{ animation: "none" }} />
      <Stack.Screen name="notifications" options={{ animation: "none" }} />
      <Stack.Screen name="account" options={{ animation: "none" }} />
    </Stack>
  );
}
