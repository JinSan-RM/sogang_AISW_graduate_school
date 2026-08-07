import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { MyPageDrawerProvider } from "../../components/MyPageDrawer";

export default function TabsLayout() {
  return (
    <MyPageDrawerProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#2761FF",
          tabBarInactiveTintColor: "#8A919C",
          tabBarIconStyle: { marginTop: 0 },
          tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 14, marginTop: 3, marginBottom: 0 },
          tabBarItemStyle: { paddingVertical: 0 },
          tabBarStyle: {
            height: 74,
            borderTopColor: "#E1E4E9",
            paddingTop: 8,
            paddingBottom: 8,
            backgroundColor: "#FFFFFF",
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "홈",
            tabBarIcon: ({ color }) => <Feather name="home" color={color} size={20} />,
          }}
        />
        <Tabs.Screen
          name="notices"
          options={{
            title: "공지사항",
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="bullhorn-outline" color={color} size={21} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "커뮤니티",
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="message-text-outline" color={color} size={21} />,
          }}
        />
        <Tabs.Screen
          name="participation"
          options={{
            title: "참여활동",
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-text-outline" color={color} size={21} />,
          }}
        />
        <Tabs.Screen
          name="council"
          options={{
            title: "원우회",
            tabBarIcon: ({ color }) => <Feather name="users" color={color} size={20} />,
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
