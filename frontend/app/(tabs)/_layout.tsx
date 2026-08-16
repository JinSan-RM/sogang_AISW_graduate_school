import { Tabs, usePathname } from "expo-router";

import { CommunityTabIcon, CouncilTabIcon, HomeTabIcon, NoticeTabIcon, ParticipationTabIcon } from "../../components/icons";
import { MyPageDrawerProvider } from "../../components/MyPageDrawer";
import { shouldHideTabBar } from "../../utils/tabBarVisibility";

const TAB_BAR_STYLE = {
  height: 74,
  borderTopColor: "#E1E4E9",
  paddingTop: 8,
  paddingBottom: 8,
  backgroundColor: "#FFFFFF",
};

export default function TabsLayout() {
  const pathname = usePathname();
  const hideTabBar = shouldHideTabBar(pathname);

  return (
    <MyPageDrawerProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#2761FF",
          tabBarInactiveTintColor: "#8A919C",
          tabBarIconStyle: { marginTop: 0 },
          // Figma: 라벨 11/13 Regular (react-navigation 기본 fontWeight 500 오버라이드)
          tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_400Regular", fontWeight: "400", lineHeight: 13, marginTop: 3, marginBottom: 0 },
          tabBarItemStyle: { paddingVertical: 0 },
          tabBarStyle: TAB_BAR_STYLE,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "홈",
            tabBarIcon: ({ color }) => <HomeTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="notices"
          options={{
            title: "공지사항",
            tabBarIcon: ({ color }) => <NoticeTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "커뮤니티",
            tabBarIcon: ({ color }) => <CommunityTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="participation"
          options={{
            title: "참여활동",
            tabBarIcon: ({ color }) => <ParticipationTabIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="council"
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
      </Tabs>
    </MyPageDrawerProvider>
  );
}
