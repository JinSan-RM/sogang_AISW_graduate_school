import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { API_BASE_URL, authApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("test@sogang.ac.kr");
  const [password, setPassword] = useState("password123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setSession = useUserStore((state) => state.setSession);

  const handleLogin = async () => {
    try {
      setIsSubmitting(true);
      const response = await authApi.login({ email, password });
      setSession(response.data);
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("로그인 실패", "이메일과 비밀번호를 확인하세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 12, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>로그인</Text>
      <Text style={{ color: "#64748b", fontSize: 12 }}>API: {API_BASE_URL}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="이메일"
        style={{ borderWidth: 1, padding: 12 }}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, padding: 12 }}
        value={password}
      />
      <Button disabled={isSubmitting} onPress={handleLogin} title={isSubmitting ? "로그인 중..." : "로그인"} />
      <Button onPress={() => router.push("/auth/register")} title="회원가입" />
      <Button onPress={() => router.push("/auth/password-reset")} title="비밀번호 재설정" />
    </View>
  );
}
