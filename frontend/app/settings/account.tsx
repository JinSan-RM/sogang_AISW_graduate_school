import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMeQuery } from "../../hooks/useApi";
import { userApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import { apiErrorCode, passwordError } from "../../utils/authValidation";
import { clearStoredPushToken } from "../../utils/pushTokenStorage";

const COLORS = {
  primary: "#2761FF",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#8A919C",
  border: "#EEF0F3",
  bg: "#FFFFFF",
  danger: "#FF6B6B",
};

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useMeQuery();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const clearSession = useUserStore((state) => state.clearSession);
  const me = data?.data;

  const changePassword = async () => {
    setPasswordMessage(null);
    if (!currentPassword) {
      setPasswordMessage("현재 비밀번호를 입력해주세요.");
      return;
    }
    const validationMessage = passwordError(newPassword);
    if (validationMessage) {
      setPasswordMessage(validationMessage);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("새 비밀번호가 서로 일치하지 않아요.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMessage("현재 비밀번호와 다른 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await userApi.updatePassword({ current_password: currentPassword, new_password: newPassword });
      await clearStoredPushToken().catch(() => undefined);
      clearSession();
      Alert.alert("비밀번호 변경 완료", "보안을 위해 저장된 로그인 세션을 종료했습니다. 새 비밀번호로 다시 로그인해주세요.");
      router.replace("/auth/login");
    } catch (error) {
      setPasswordMessage(
        apiErrorCode(error) === "FORBIDDEN"
          ? "현재 비밀번호가 올바르지 않아요."
          : "비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const deactivate = () => {
    Alert.alert("회원 탈퇴", "계정을 비활성화하면 다시 로그인할 수 없습니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: async () => {
          try {
            await userApi.deactivateMe({ reason: "user_requested" });
            await clearStoredPushToken().catch(() => undefined);
            clearSession();
            Alert.alert("계정 비활성화 완료", "계정이 비활성화되었습니다.");
            router.replace("/auth/login");
          } catch {
            Alert.alert("비활성화 실패", "잠시 후 다시 시도해주세요.");
          }
        },
      },
    ]);
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
        <Text style={styles.appBarTitle}>계정 설정</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.menuList}>
          <Pressable
            onPress={() => {
              setShowPasswordForm((value) => !value);
              setPasswordMessage(null);
            }}
            style={styles.menuRow}
          >
            <Text style={styles.menuText}>비밀번호 변경</Text>
            <Ionicons name={showPasswordForm ? "chevron-up" : "chevron-forward"} size={20} color={COLORS.subtle} />
          </Pressable>
          {showPasswordForm ? (
            <View style={styles.formSection}>
              <TextInput
                onChangeText={setCurrentPassword}
                placeholder="현재 비밀번호"
                placeholderTextColor={COLORS.subtle}
                secureTextEntry
                style={styles.input}
                value={currentPassword}
              />
              <TextInput
                onChangeText={setNewPassword}
                placeholder="새 비밀번호"
                placeholderTextColor={COLORS.subtle}
                secureTextEntry
                style={styles.input}
                value={newPassword}
              />
              <Text style={styles.helper}>영문, 숫자, 특수문자를 포함해 8자 이상 입력해주세요.</Text>
              <TextInput
                onChangeText={setConfirmPassword}
                placeholder="새 비밀번호 확인"
                placeholderTextColor={COLORS.subtle}
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />
              {passwordMessage ? <Text style={styles.errorText}>{passwordMessage}</Text> : null}
              <Pressable disabled={isChangingPassword} onPress={changePassword} style={[styles.primaryButton, isChangingPassword && styles.disabled]}>
                <Text style={styles.primaryButtonText}>{isChangingPassword ? "변경 중" : "비밀번호 변경"}</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            onPress={() => Alert.alert("학교 이메일 인증 정보", me?.email ? `${me.email}\n인증된 학교 이메일입니다.` : "인증 정보를 불러오는 중입니다.")}
            style={styles.menuRow}
          >
            <Text style={styles.menuText}>학교 이메일 인증 정보</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
          </Pressable>
          <Pressable onPress={() => router.push("/legal/terms")} style={styles.menuRow}>
            <Text style={styles.menuText}>이용약관</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
          </Pressable>
          <Pressable onPress={() => router.push("/legal/privacy")} style={styles.menuRow}>
            <Text style={styles.menuText}>개인정보 처리방침</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
          </Pressable>
          <Pressable onPress={deactivate} style={styles.menuRow}>
            <Text style={styles.dangerText}>회원 탈퇴</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.subtle} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  appBarTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900" },
  scroller: { flex: 1 },
  content: { paddingBottom: 36 },
  formSection: {
    gap: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 14,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 15,
  },
  helper: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  primaryButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
  disabled: { opacity: 0.55 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  menuList: { borderTopWidth: 1, borderTopColor: COLORS.border },
  menuRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 24,
  },
  menuText: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  dangerText: { color: COLORS.danger, fontSize: 16, fontWeight: "900" },
});
