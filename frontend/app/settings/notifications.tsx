import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { notificationApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import type { NotificationSettings } from "../../types";
import { getWebNotificationPermission, requestWebNotificationPermission, showWebNotification, type WebNotificationPermission } from "../../utils/webNotifications";

const COLORS = {
  primary: "#2761FF",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#A6ACB7",
  border: "#E1E4E9",
  bg: "#FFFFFF",
};

const DEFAULT_SETTINGS: NotificationSettings = {
  notify_comment: true,
  notify_like: true,
  notify_notice: true,
  notify_event: true,
  notify_council: true,
};

const SETTING_ROWS: Array<{ key: keyof NotificationSettings; label: string }> = [
  { key: "notify_notice", label: "공지사항 알림" },
  { key: "notify_event", label: "일정 알림" },
  { key: "notify_comment", label: "커뮤니티 댓글 알림" },
  { key: "notify_council", label: "원우회 소식 알림" },
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationSettings | null>(null);
  const [webPermission, setWebPermission] = useState<WebNotificationPermission>(() => getWebNotificationPermission());

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    notificationApi
      .getSettings()
      .then((response) => setSettings(response.data))
      .catch(() => Alert.alert("불러오기 실패", "알림 설정을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSavingKey(key);
    try {
      const response = await notificationApi.updateSettings(next);
      setSettings(response.data);
    } catch {
      setSettings(settings);
      Alert.alert("저장 실패", "알림 설정을 저장하지 못했습니다.");
    } finally {
      setSavingKey(null);
    }
  };

  const enableWebNotifications = async () => {
    const permission = await requestWebNotificationPermission();
    setWebPermission(permission);
    if (permission === "granted") showWebNotification("Sogang AI-SW", "웹 브라우저 알림이 켜졌어요.", () => undefined);
    if (permission === "denied") Alert.alert("브라우저 알림 차단됨", "브라우저 사이트 설정에서 알림 권한을 허용해주세요.");
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/settings");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>알림 설정</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.list}>
          {Platform.OS === "web" ? (
            <View style={styles.webPermissionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>웹 브라우저 알림</Text>
                <Text style={styles.permissionHelp}>
                  {webPermission === "granted" ? "브라우저 시스템 알림이 허용되어 있어요." : webPermission === "denied" ? "브라우저 설정에서 권한을 허용해주세요." : webPermission === "unsupported" ? "이 브라우저는 시스템 알림을 지원하지 않아요." : "사이트가 열려 있을 때 시스템 알림을 받을 수 있어요."}
                </Text>
              </View>
              <Pressable disabled={webPermission === "granted" || webPermission === "unsupported"} onPress={() => void enableWebNotifications()} style={[styles.permissionButton, webPermission === "granted" ? styles.permissionButtonActive : null]}>
                <Text style={[styles.permissionButtonText, webPermission === "granted" ? styles.permissionButtonTextActive : null]}>{webPermission === "granted" ? "허용됨" : "허용"}</Text>
              </Pressable>
            </View>
          ) : null}
          {SETTING_ROWS.map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={styles.rowText}>{row.label}</Text>
              <Switch
                disabled={!isAuthenticated || savingKey === row.key}
                onValueChange={(value) => updateSetting(row.key, value)}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: COLORS.primary }}
                value={settings[row.key]}
              />
            </View>
          ))}
          {!isAuthenticated ? (
            <Pressable onPress={() => router.replace("/auth/login")} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>로그인 후 설정하기</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "500",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 13,
  },
  rowText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
  },
  webPermissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 13,
  },
  permissionHelp: { color: COLORS.subtle, fontSize: 12, lineHeight: 18, marginTop: 4 },
  permissionButton: { borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8 },
  permissionButtonActive: { backgroundColor: COLORS.primary },
  permissionButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: "500" },
  permissionButtonTextActive: { color: "#FFFFFF" },
  loginButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 22,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
});
