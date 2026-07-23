import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { userApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import { apiErrorCode, passwordError } from "../../utils/authValidation";
import { clearStoredPushToken } from "../../utils/pushTokenStorage";

const COLORS = {
  primary: "#2761FF",
  text: "#15171C",
  label: "#6B7280",
  placeholder: "#A6ACB7",
  border: "#E1E4E9",
  bg: "#FFFFFF",
  danger: "#E24B4A",
};

export default function PasswordChangeScreen() {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clearSession = useUserStore((state) => state.clearSession);

  const changePassword = async () => {
    setMessage(null);
    if (!currentPassword) {
      setMessage("현재 비밀번호를 입력해주세요.");
      return;
    }
    const validationMessage = passwordError(newPassword);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("새 비밀번호가 서로 일치하지 않아요.");
      return;
    }
    if (currentPassword === newPassword) {
      setMessage("현재 비밀번호와 다른 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await userApi.updatePassword({ current_password: currentPassword, new_password: newPassword });
      await clearStoredPushToken().catch(() => undefined);
      clearSession();
      Alert.alert("비밀번호 변경 완료", "보안을 위해 저장된 로그인 세션을 종료했습니다. 새 비밀번호로 다시 로그인해주세요.");
      router.replace("/auth/login");
    } catch (error) {
      setMessage(
        apiErrorCode(error) === "FORBIDDEN"
          ? "현재 비밀번호가 올바르지 않아요."
          : "비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/settings/account");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>비밀번호 변경</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>현재 비밀번호</Text>
          <TextInput
            onChangeText={setCurrentPassword}
            placeholder="현재 비밀번호를 입력하세요"
            placeholderTextColor={COLORS.placeholder}
            secureTextEntry
            style={styles.input}
            value={currentPassword}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>새 비밀번호</Text>
          <TextInput
            onChangeText={setNewPassword}
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            placeholderTextColor={COLORS.placeholder}
            secureTextEntry
            style={styles.input}
            value={newPassword}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>새 비밀번호 확인</Text>
          <TextInput
            onChangeText={setConfirmPassword}
            placeholder="새 비밀번호를 다시 입력하세요"
            placeholderTextColor={COLORS.placeholder}
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
          />
        </View>

        {message ? <Text style={styles.errorText}>{message}</Text> : null}

        <Pressable disabled={isSubmitting} onPress={changePassword} style={[styles.primaryButton, isSubmitting && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{isSubmitting ? "변경 중" : "변경 완료"}</Text>
        </Pressable>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  appBarTitle: { color: COLORS.text, fontSize: 17, fontWeight: "500" },
  scroller: { flex: 1 },
  content: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 24, gap: 20 },
  fieldGroup: { gap: 8 },
  label: { color: COLORS.label, fontSize: 13, fontWeight: "400" },
  input: {
    minHeight: 41,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: "400", lineHeight: 19, marginTop: -8 },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
  },
  disabled: { opacity: 0.55 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "500" },
});
