import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { MyPageDrawerProvider } from "../../components/MyPageDrawer";

export default function TabsLayout() {
  return (
    <MyPageDrawerProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#2761FF",
          tabBarInactiveTintColor: "#8A919C",
          tabBarIconStyle: { marginTop: 4 },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "400", lineHeight: 14, marginTop: 0, transform: [{ translateY: -2 }] },
          tabBarItemStyle: { paddingVertical: 0 },
          tabBarStyle: {
            height: 68,
            borderTopColor: "#E1E4E9",
            paddingTop: 2,
            paddingBottom: 0,
            backgroundColor: "#FFFFFF",
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "홈",
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="notices"
          options={{
            title: "공지사항",
            tabBarIcon: ({ color }) => <Ionicons name="megaphone-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "커뮤니티",
            tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="participation"
          options={{
            title: "참여활동",
            tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="council"
          options={{
            title: "원우회",
            tabBarIcon: ({ color }) => <Ionicons name="people-outline" color={color} size={22} />,
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
          }}
        />
      </Tabs>
    </MyPageDrawerProvider>
  );
}
