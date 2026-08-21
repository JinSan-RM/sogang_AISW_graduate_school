import { create } from "zustand";

// 게시판/상세 화면은 숨김 탭(board) 안에 있어 하단바가 포커스 탭을 잃는다.
// 화면이 자신의 소속 카테고리 탭을 여기 기록하면 커스텀 탭바가 그 탭을 하이라이트한다.
type TabHighlightState = {
  tab: string;
  setTab: (tab: string) => void;
};

export const useTabHighlightStore = create<TabHighlightState>((set) => ({
  tab: "home",
  setTab: (tab) => set({ tab }),
}));

// boardParentRoute()가 주는 "/(tabs)/notices" 형태를 탭 이름으로 바꾼다.
export function tabNameFromRoute(route: string): string {
  return route.split("/").pop() || "home";
}
