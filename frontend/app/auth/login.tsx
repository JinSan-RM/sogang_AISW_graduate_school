import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";
import SchoolEmailInput from "../../components/SchoolEmailInput";
import { composeSchoolEmail, emailIdError } from "../../utils/authValidation";

const COLORS = {
  primary: "#2761FF",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#A0A7B2",
  border: "#E5E7EB",
  danger: "#DC2626",
  bg: "#FFFFFF",
};

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setSession = useUserStore((state) => state.setSession);

  const handleLogin = async () => {
    const nextEmailError = emailIdError(emailId);
    const nextPasswordError = password ? undefined : "비밀번호를 입력해주세요.";
    if (nextEmailError || nextPasswordError) {
      setErrors({ email: nextEmailError ?? undefined, password: nextPasswordError });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      const response = await authApi.login({ email: composeSchoolEmail(emailId), password });
      setSession(response.data);
      router.replace("/(tabs)/home");
    } catch {
      setErrors({ form: "이메일 또는 비밀번호가 일치하지 않아요." });
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
          }}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>로그인</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>이메일</Text>
          <SchoolEmailInput
            value={emailId}
            onChangeText={(value) => {
              setEmailId(value);
              setErrors((current) => ({ ...current, email: undefined, form: undefined }));
            }}
            hasError={Boolean(errors.email || errors.form)}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            onChangeText={(value) => {
              setPassword(value);
              setErrors((current) => ({ ...current, password: undefined, form: undefined }));
            }}
            placeholder="비밀번호"
            placeholderTextColor={COLORS.subtle}
            secureTextEntry
            style={[styles.input, errors.password || errors.form ? styles.inputError : null]}
            value={password}
          />
        </View>

        {errors.form || errors.email || errors.password ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
            <Text style={styles.errorText}>{errors.form ?? errors.email ?? errors.password}</Text>
          </View>
        ) : null}

        <Pressable disabled={isSubmitting} onPress={handleLogin} style={[styles.primaryButton, isSubmitting ? styles.disabledButton : null]}>
          <Text style={styles.primaryButtonText}>{isSubmitting ? "로그인 중" : "로그인"}</Text>
        </Pressable>

        <View style={styles.links}>
          <Pressable onPress={() => router.push("/auth/register")}>
            <Text style={styles.linkText}>회원가입</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/auth/password-reset")}>
            <Text style={styles.linkText}>비밀번호 찾기</Text>
          </Pressable>
        </View>
      </View>
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
    paddingHorizontal: 18,
    paddingBottom: 10,
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
    fontWeight: "900",
  },
  content: {
    gap: 18,
    paddingHorizontal: 31,
    paddingTop: 30,
  },
  field: {
    gap: 10,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: "#FFF5F5",
  },
  primaryButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: -8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 4,
  },
  linkText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "800",
  },
});
