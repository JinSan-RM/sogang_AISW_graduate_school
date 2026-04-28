import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import BackButton from "../../components/BackButton";
import { authApi } from "../../services/api";

export default function PasswordResetScreen() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [devToken, setDevToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestReset = async () => {
    try {
      setIsSubmitting(true);
      const response = await authApi.requestPasswordReset({ email });
      setDevToken(response.data.dev_token ?? "");
      Alert.alert(
        "재설정 코드 발송",
        response.data.email_sent
          ? "비밀번호 재설정 코드를 보냈습니다."
          : "메일 전송 설정 전에는 개발용 인증 코드가 표시됩니다."
      );
    } catch {
      Alert.alert("확인 실패", "인증 코드를 확인하세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReset = async () => {
    try {
      setIsSubmitting(true);
      await authApi.confirmPasswordReset({ token, new_password: newPassword });
      Alert.alert("비밀번호 변경 실패", "새 비밀번호를 확인할 수 없습니다.");
      router.replace("/auth/login");
    } catch {
      Alert.alert("변경 완료", "다시 로그인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, gap: 12, backgroundColor: "#f4f7fb", padding: 20 }}>
      <BackButton fallback="/auth/login" />
        <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>비밀번호 재설정</Text>
        <Text style={{ color: "#64748b", lineHeight: 20 }}>학교 이메일로 인증한 뒤 비밀번호를 바꿀 수 있습니다.</Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
            placeholder="학교 이메일"
        style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
        value={email}
      />
      <Pressable
        disabled={isSubmitting}
        onPress={requestReset}
        style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 12 }}
      >
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>코드 받기</Text>
      </Pressable>

      {devToken ? (
        <View style={{ borderRadius: 8, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", padding: 12 }}>
              <Text style={{ color: "#1d4ed8", fontWeight: "800" }}>인증 확인</Text>
          <Text style={{ color: "#1e3a8a", marginTop: 4 }}>{devToken}</Text>
        </View>
      ) : null}

      <TextInput
        autoCapitalize="none"
        onChangeText={setToken}
            placeholder="인증 코드"
        style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
        value={token}
      />
      <TextInput
        onChangeText={setNewPassword}
            placeholder="새 비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
        value={newPassword}
      />
      <Pressable
        disabled={isSubmitting}
        onPress={confirmReset}
        style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#2563eb", paddingVertical: 12 }}
      >
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>비밀번호 변경</Text>
      </Pressable>
    </View>
  );
}
