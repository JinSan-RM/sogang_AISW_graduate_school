import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";

import BackButton from "../../components/BackButton";
import { notificationApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import type { NotificationItem, NotificationSettings } from "../../types";

const DEFAULT_SETTINGS: NotificationSettings = {
  notify_comment: true,
  notify_like: true,
  notify_notice: true,
  notify_event: true,
};

const LABELS: Record<keyof NotificationSettings, string> = {
  notify_comment: "댓글",
  notify_like: "좋아요",
  notify_notice: "공지 및 안내",
  notify_event: "일정",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  comment: "댓글",
  like: "좋아요",
  notice: "공지",
  event: "일정",
};

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  const load = async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      const settingsRes = await notificationApi.getSettings();
      const notificationsRes = await notificationApi.getNotifications();
      setSettings(settingsRes.data);
      setNotifications(notificationsRes.data);
    } catch {
      setLoadError("알림 정보를 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    load();
  }, [isAuthenticated]);

  const update = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    const response = await notificationApi.updateSettings(settings);
    setSettings(response.data);
    Alert.alert("저장 완료", "알림 설정이 저장되었습니다.");
  };

  const markRead = async (notificationId: number) => {
    await notificationApi.markRead(notificationId);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification
      )
    );
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      markRead(notification.id).catch(() => undefined);
    }
    if (notification.post_id) {
      router.push(`/board/post/${notification.post_id}`);
    } else if (notification.event_id) {
      router.push("/events");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f7fb" }} contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}>
      <BackButton fallback="/(tabs)/settings" />
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>알림</Text>

      {!isAuthenticated ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 16 }}>
          <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900" }}>로그인이 필요합니다</Text>
          <Text style={{ color: "#64748b", marginTop: 6 }}>알림 설정과 알림함은 로그인 후 사용할 수 있습니다.</Text>
          <Pressable
            onPress={() => router.push("/auth/login")}
            style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", marginTop: 12, paddingVertical: 12 }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>로그인하러 가기</Text>
          </Pressable>
        </View>
      ) : null}

      {isAuthenticated ? (
      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 14 }}>
        <Text style={{ color: "#112d4e", fontSize: 17, fontWeight: "900", marginBottom: 8 }}>알림 설정</Text>
        {(Object.keys(settings) as Array<keyof NotificationSettings>).map((key) => (
          <View key={key} style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 }}>
            <Text style={{ color: "#111827", fontWeight: "700" }}>{LABELS[key]}</Text>
            <Switch onValueChange={(next) => update(key, next)} value={settings[key]} />
          </View>
        ))}
        <Pressable onPress={save} style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", marginTop: 10, paddingVertical: 12 }}>
          <Text style={{ color: "#ffffff", fontWeight: "900" }}>설정 저장</Text>
        </Pressable>
      </View>
      ) : null}

      {isAuthenticated ? (
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: "#112d4e", fontSize: 17, fontWeight: "900" }}>최근 알림</Text>
          <Pressable onPress={load} style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", paddingHorizontal: 10, paddingVertical: 7 }}>
            <Text style={{ color: "#2563eb", fontWeight: "800" }}>새로고침</Text>
          </Pressable>
        </View>
        {isLoading ? (
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 16 }}>
            <ActivityIndicator />
          </View>
        ) : null}
        {loadError ? (
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff7f7", padding: 16, marginBottom: 10 }}>
            <Text style={{ color: "#b91c1c", fontWeight: "800" }}>{loadError}</Text>
          </View>
        ) : null}
        {!isLoading && !loadError && notifications.length === 0 ? (
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 16 }}>
            <Text style={{ color: "#64748b" }}>새 알림이 없습니다.</Text>
          </View>
        ) : null}
        {!isLoading && !loadError && notifications.length > 0 ? (
          notifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => openNotification(notification)}
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: notification.is_read ? "#dbe3ef" : "#bfdbfe",
                backgroundColor: notification.is_read ? "#ffffff" : "#eff6ff",
                padding: 14,
              }}
            >
              <Ionicons name={notification.is_read ? "mail-open-outline" : "mail-unread-outline"} size={22} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#111827", fontWeight: "800" }}>{notification.message}</Text>
                <Text style={{ color: "#64748b", marginTop: 4 }}>
                  {NOTIFICATION_TYPE_LABELS[notification.notification_type] ?? notification.notification_type} | {new Date(notification.created_at).toLocaleString()}
                </Text>
              </View>
            </Pressable>
          ))
        ) : null}
      </View>
      ) : null}
    </ScrollView>
  );
}
