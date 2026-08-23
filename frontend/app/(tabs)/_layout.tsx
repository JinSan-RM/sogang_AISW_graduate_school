import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router, Tabs, usePathname } from "expo-router";
import { useRef } from "react";

import { CommunityTabIcon, CouncilTabIcon, HomeTabIcon, NoticeTabIcon, ParticipationTabIcon } from "../../components/icons";
import { MyPageDrawerProvider } from "../../components/MyPageDrawer";
import { useTabHighlightStore } from "../../stores/tabHighlightStore";
import {
  requestTabRootReset,
  tabRootPressAction,
  type VisibleTabRootName,
} from "../../stores/tabRootResetStore";
import { shouldHideTabBar } from "../../utils/tabBarVisibility";

const TAB_BAR_STYLE = {
  height: 74,
  borderTopColor: "#E1E4E9",
  paddingTop: 8,
  paddingBottom: 8,
  backgroundColor: "#FFFFFF",
};

const VISIBLE_TAB_NAMES = new Set(["home", "notices", "community", "participation", "council"]);

function handleTabRootPress(
  tabName: VisibleTabRootName,
  event: { preventDefault: () => void },
) {
  const action = tabRootPressAction(tabName);
  event.preventDefault();
  if (action.resetTab) {
    requestTabRootReset(action.resetTab);
  }
  router.navigate(action.route as never);
}

// 숨김 탭(board/events 등)이 포커스되면 기본 탭바는 아무 탭도 하이라이트하지 않는다.
// 게시판 화면이 기록한 소속 카테고리(board), 그 외에는 마지막 방문 탭을 하이라이트한다.
function CategoryHighlightTabBar(props: BottomTabBarProps) {
  const highlightTab = useTabHighlightStore((state) => state.tab);
  const lastVisibleTabRef = useRef("home");
  const { state } = props;
  const focusedName = state.routes[state.index]?.name;

  if (focusedName && VISIBLE_TAB_NAMES.has(focusedName)) {
    lastVisibleTabRef.current = focusedName;
    return <BottomTabBar {...props} />;
  }

  const targetName = focusedName === "board" ? highlightTab : lastVisibleTabRef.current;
  const targetIndex = state.routes.findIndex((route) => route.name === targetName);
  if (targetIndex < 0) {
    return <BottomTabBar {...props} />;
  }
  return <BottomTabBar {...props} state={{ ...state, index: targetIndex }} />;
}

export default function TabsLayout() {
  const pathname = usePathname();
  const hideTabBar = shouldHideTabBar(pathname);

  return (
    <MyPageDrawerProvider>
      <Tabs
        tabBar={(props) => <CategoryHighlightTabBar {...props} />}
        screenOptions={{
          tabBarActiveTintColor: "#2761FF",
          tabBarInactiveTintColor: "#8A919C",
          tabBarIconStyle: { marginTop: 0 },
          // Figma: 라벨 11/13 Regular (react-navigation 기본 fontWeight 500 오버라이드)
          tabBarLabelStyle: { fontSize: 11, fontFamily: "Pretendard_400Regular", fontWeight: "400", lineHeight: 13, marginTop: 3, marginBottom: 0 },
          tabBarItemStyle: { paddingVertical: 0 },
          tabBarStyle: TAB_BAR_STYLE,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          listeners={() => ({
            tabPress: (event) => handleTabRootPress("home", event),
          })}
          options={{
            title: "홈",
            tabBarIcon: ({ color }) => <HomeTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="notices"
          listeners={() => ({
            tabPress: (event) => handleTabRootPress("notices", event),
          })}
          options={{
            title: "공지사항",
            tabBarIcon: ({ color }) => <NoticeTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="community"
          listeners={() => ({
            tabPress: (event) => handleTabRootPress("community", event),
          })}
          options={{
            title: "커뮤니티",
            tabBarIcon: ({ color }) => <CommunityTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="participation"
          listeners={() => ({
            tabPress: (event) => handleTabRootPress("participation", event),
          })}
          options={{
            title: "참여활동",
            tabBarIcon: ({ color }) => <ParticipationTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="council"
          listeners={() => ({
            tabPress: (event) => handleTabRootPress("council", event),
          })}
          options={{
            title: "원우회",
            tabBarIcon: ({ color }) => <CouncilTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="boards"
          options={{
            title: "게시판",
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "설정",
            href: null,
            tabBarStyle: hideTabBar ? { display: "none" } : TAB_BAR_STYLE,
          }}
        />
        {/* 탭바를 유지한 채 여는 화면들 — 탭 버튼으로는 노출하지 않는다.
            board/events는 중첩 Stack이라 진입마다 새 화면이 push되어 params/상태가 늘 새것이다. */}
        {["search", "events", "faq", "guides", "notifications", "board", "council/mutual-aid-complete"].map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </MyPageDrawerProvider>
  );
}
