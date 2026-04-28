import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { authApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [cohort, setCohort] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setSession = useUserStore((state) => state.setSession);

  const requestCode = async () => {
    try {
      setIsSubmitting(true);
      const response = await authApi.requestRegisterVerification({ email });
      setDevCode(response.data.dev_code ?? "");
      Alert.alert(
        "인증 코드 발송 실패",
        response.data.email_sent
          ? "이미 가입된 이메일일 수 있습니다."
          : "메일 전송 설정 전에는 개발용 인증 코드가 표시됩니다."
      );
    } catch {
      Alert.alert("인증 실패", "서강 sogang.ac.kr 이메일을 입력하세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    try {
      setIsSubmitting(true);
      const response = await authApi.verifyRegisterEmail({ email, code });
      setVerificationToken(response.data.verification_token);
      Alert.alert("인증 실패", "인증 코드를 확인할 수 없습니다.");
    } catch {
      Alert.alert("인증 실패", "인증 코드를 확인하세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async () => {
    try {
      setIsSubmitting(true);
      const response = await authApi.register({ verification_token: verificationToken, password, nickname, cohort });
      setSession(response.data);
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("회원가입 실패", "입력 정보를 확인하세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ gap: 12, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>회원가입</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="학교 이메일"
        style={{ borderWidth: 1, padding: 12 }}
        value={email}
      />
      <Button disabled={isSubmitting} onPress={requestCode} title="인증 코드 받기" />
      {devCode ? <Text>개발용 코드: {devCode}</Text> : null}
      <TextInput
        keyboardType="number-pad"
        onChangeText={setCode}
        placeholder="인증 코드"
        style={{ borderWidth: 1, padding: 12 }}
        value={code}
      />
      <Button disabled={isSubmitting} onPress={verifyCode} title="인증 확인" />
      <TextInput
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, padding: 12 }}
        value={password}
      />
      <TextInput onChangeText={setNickname} placeholder="닉네임" style={{ borderWidth: 1, padding: 12 }} value={nickname} />
      <TextInput onChangeText={setCohort} placeholder="기수" style={{ borderWidth: 1, padding: 12 }} value={cohort} />
      <Button disabled={isSubmitting || !verificationToken} onPress={register} title="회원가입" />
    </View>
  );
}
