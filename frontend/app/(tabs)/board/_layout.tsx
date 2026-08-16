import { Stack } from "expo-router";

// 탭바를 유지하면서 게시판 → 상세 → 글쓰기가 진짜 스택으로 쌓이게 한다.
// (숨김 탭 단일 화면 방식은 재진입 시 이전 params/상태가 남는다)
export default function BoardStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />;
}
