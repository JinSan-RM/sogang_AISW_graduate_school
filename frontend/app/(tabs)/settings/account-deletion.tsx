import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { userApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import {
  ACCOUNT_DELETION_ITEMS,
  ACCOUNT_RETENTION_NOTICE,
  accountDeletionErrorMessage,
} from "../../utils/accountDeletion";
import { apiErrorCode, apiErrorStatus } from "../../utils/authValidation";
import { clearStoredPushToken } from "../../utils/pushTokenStorage";

const COLORS = {
  primary: "#2761FF",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#A6ACB7",
  border: "#E1E4E9",
  bg: "#FFFFFF",
  panel: "#F8FAFC",
  danger: "#C73939",
  dangerBg: "#FFF4F4",
  disabled: "#D1D5DB",
};

export default function AccountDeletionScreen() {
  const insets = useSafeAreaInsets();
  const clearSession = useUserStore((state) => state.clearSession);
  const [currentPassword, setCurrentPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const canSubmit = Boolean(currentPassword) && acknowledged && !isSubmitting;

  const deleteAccount = async () => {
    setPasswordError(null);
    setRequestError(null);

    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (!acknowledged) {
      setRequestError("삭제 대상과 보존 내용을 확인해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await userApi.deleteMe({
        current_password: currentPassword,
      });
      if (!response.data.deleted) {
        throw new Error("Account deletion was not confirmed by the server.");
      }

      await clearStoredPushToken().catch(() => undefined);
      clearSession();
      router.replace("/legal/account-deletion?completed=1");
    } catch (error) {
      const status = apiErrorStatus(error);
      const code = apiErrorCode(error);
      if (status === 403 || code === "FORBIDDEN") {
        setPasswordError("현재 비밀번호가 일치하지 않습니다.");
      } else {
        setRequestError(accountDeletionErrorMessage(status ?? (code ? undefined : 0), code));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          accessibilityLabel="뒤로"
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/settings/account");
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.appBarTitle}>
          계정 및 데이터 삭제
        </Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroller}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningTitleRow}>
            <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
            <Text style={styles.warningTitle}>삭제 요청 전 확인해주세요</Text>
          </View>
          <Text style={styles.warningLead}>
            이 작업은 계정과 개인정보를 삭제하며 완료 후에는 되돌리거나 다시 로그인할 수 없습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            삭제 및 익명화되는 항목
          </Text>
          {ACCOUNT_DELETION_ITEMS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bodyText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            보존될 수 있는 정보
          </Text>
          <Text style={styles.bodyText}>{ACCOUNT_RETENTION_NOTICE}</Text>
          <Pressable
            accessibilityHint="개인정보 처리방침 화면을 엽니다."
            accessibilityRole="link"
            onPress={() => router.push("/legal/privacy")}
          >
            <Text style={styles.linkText}>개인정보 처리방침 자세히 보기</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>현재 비밀번호 재확인</Text>
          <TextInput
            accessibilityLabel="현재 비밀번호"
            autoCapitalize="none"
            autoComplete="current-password"
            onChangeText={(value) => {
              setCurrentPassword(value);
              setPasswordError(null);
              setRequestError(null);
            }}
            onSubmitEditing={() => {
              if (canSubmit) void deleteAccount();
            }}
            placeholder="현재 비밀번호를 입력하세요"
            placeholderTextColor={COLORS.subtle}
            secureTextEntry
            style={[styles.input, passwordError ? styles.inputError : null]}
            value={currentPassword}
          />
          {passwordError ? (
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorText}>
              {passwordError}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityHint="선택해야 계정 삭제 버튼이 활성화됩니다."
          accessibilityLabel="계정 삭제 및 데이터 보존 안내를 확인했습니다"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          onPress={() => {
            setAcknowledged((value) => !value);
            setRequestError(null);
          }}
          style={styles.confirmRow}
        >
          <Ionicons
            name={acknowledged ? "checkbox" : "square-outline"}
            size={22}
            color={acknowledged ? COLORS.primary : COLORS.muted}
          />
          <Text style={styles.confirmText}>위 삭제 대상과 보존 내용을 확인했습니다.</Text>
        </Pressable>

        {requestError ? (
          <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{requestError}</Text>
            <Pressable
              accessibilityLabel="계정 삭제 다시 시도"
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={() => void deleteAccount()}
            >
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityHint="비밀번호를 확인한 뒤 계정과 개인정보를 삭제합니다."
          accessibilityLabel="계정 삭제"
          accessibilityRole="button"
          accessibilityState={{ busy: isSubmitting, disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={() => void deleteAccount()}
          style={[styles.deleteButton, !canSubmit ? styles.deleteButtonDisabled : null]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteButtonText}>계정 삭제</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/settings/password")}
          style={styles.secondaryLink}
        >
          <Text style={styles.secondaryLinkText}>삭제하지 않고 비밀번호 변경</Text>
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
  appBarTitle: { color: COLORS.text, fontSize: 17, fontWeight: "600" },
  scroller: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40, gap: 20 },
  warningCard: {
    borderWidth: 1,
    borderColor: "#F4B4B4",
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    padding: 14,
    gap: 8,
  },
  warningTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  warningTitle: { flex: 1, color: COLORS.danger, fontSize: 15, fontWeight: "700" },
  warningLead: { color: "#7F1D1D", fontSize: 13, lineHeight: 20 },
  section: { gap: 9 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.muted,
    marginTop: 8,
  },
  bodyText: { flex: 1, color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  linkText: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border },
  fieldGroup: { gap: 8 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerBg },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  confirmRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    padding: 12,
  },
  confirmText: { flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  errorBox: {
    borderRadius: 8,
    backgroundColor: COLORS.dangerBg,
    padding: 12,
    gap: 7,
  },
  errorBoxText: { color: COLORS.danger, fontSize: 13, lineHeight: 19 },
  retryText: { color: COLORS.danger, fontSize: 13, fontWeight: "700" },
  deleteButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 16,
  },
  deleteButtonDisabled: { backgroundColor: COLORS.disabled },
  deleteButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryLink: { alignItems: "center", paddingVertical: 8 },
  secondaryLinkText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
});
