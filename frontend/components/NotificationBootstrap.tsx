import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { notificationApi } from "../services/api";
import { useUserStore } from "../stores/userStore";
import type { NotificationItem } from "../types";

declare const require: any;

const LAST_NOTIFICATION_KEY = "aisw_last_notification_id";
const POLL_INTERVAL_MS = 5000;

type ExpoNotificationsModule = {
  setNotificationHandler?: (handler: unknown) => void;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (options?: unknown) => Promise<{ data: string }>;
  addNotificationResponseReceivedListener?: (listener: (response: unknown) => void) => { remove: () => void };
};

function getStoredLatestId() {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") {
    return 0;
  }
  return Number(localStorage.getItem(LAST_NOTIFICATION_KEY) ?? 0);
}

function storeLatestId(id: number) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(LAST_NOTIFICATION_KEY, String(id));
  }
}

function getExpoNotifications(): ExpoNotificationsModule | null {
  try {
    return require("expo-notifications") as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

function getResponseData(response: any) {
  return response?.notification?.request?.content?.data ?? {};
}

async function openNotification(notification: Pick<NotificationItem, "id" | "post_id" | "event_id">) {
  try {
    await notificationApi.markRead(notification.id);
  } catch {
    // The notification can still be opened even if read-state sync fails.
  }

  if (notification.post_id) {
    router.push(`/board/post/${notification.post_id}`);
  } else if (notification.event_id) {
    router.push("/events");
  } else {
    router.push("/settings/notifications");
  }
}

async function registerPushToken() {
  if (Platform.OS === "web") {
    return;
  }

  const Notifications = getExpoNotifications();
  if (!Notifications) {
    return;
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let status = currentPermission.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  await notificationApi.registerPushToken({ token: token.data, platform: Platform.OS });
}

export default function NotificationBootstrap() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const latestSeenIdRef = useRef(getStoredLatestId());
  const initializedRef = useRef(false);
  const [visibleNotification, setVisibleNotification] = useState<NotificationItem | null>(null);

  const openVisibleNotification = async () => {
    if (!visibleNotification) {
      return;
    }
    const target = visibleNotification;
    setVisibleNotification(null);
    await openNotification(target);
  };

  useEffect(() => {
    const Notifications = getExpoNotifications();
    Notifications?.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
      }),
    });

    const subscription = Notifications?.addNotificationResponseReceivedListener?.((response) => {
      const data = getResponseData(response);
      const notificationId = Number(data.notification_id);
      const postId = data.post_id ? Number(data.post_id) : undefined;
      const eventId = data.event_id ? Number(data.event_id) : undefined;
      if (notificationId) {
        openNotification({ id: notificationId, post_id: postId, event_id: eventId });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      initializedRef.current = false;
      return;
    }

    registerPushToken().catch(() => undefined);

    const poll = async () => {
      const response = await notificationApi.getNotifications();
      const newest = response.data[0];
      if (!newest) {
        initializedRef.current = true;
        return;
      }

      if (!initializedRef.current) {
        initializedRef.current = true;
        const latestId = Math.max(latestSeenIdRef.current, newest.id);
        latestSeenIdRef.current = latestId;
        storeLatestId(latestId);
        return;
      }

      if (newest.id <= latestSeenIdRef.current || newest.is_read) {
        return;
      }

      latestSeenIdRef.current = newest.id;
      storeLatestId(newest.id);
      setVisibleNotification(newest);
    };

    poll().catch(() => undefined);
    const intervalId = setInterval(() => {
      poll().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  if (!visibleNotification) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 9999,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#bfdbfe",
        backgroundColor: "#eff6ff",
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.16,
        shadowRadius: 10,
      }}
    >
          <Text style={{ color: "#112d4e", fontSize: 13, fontWeight: "900" }}>새 알림</Text>
      <Text style={{ color: "#111827", marginTop: 4, fontWeight: "700" }}>{visibleNotification.message}</Text>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
        <Pressable
          onPress={() => setVisibleNotification(null)}
          style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 8 }}
        >
            <Text style={{ color: "#64748b", fontWeight: "900" }}>나중에</Text>
        </Pressable>
        <Pressable onPress={openVisibleNotification} style={{ borderRadius: 8, backgroundColor: "#112d4e", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>열기</Text>
        </Pressable>
      </View>
    </View>
  );
}
