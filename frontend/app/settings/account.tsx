import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import BackButton from "../../components/BackButton";
import { userApi } from "../../services/api";
import { useUserStore } from "../../stores/userStore";

export default function AccountSettingsScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const clearSession = useUserStore((state) => state.clearSession);

  const changePassword = async () => {
    try {
      await userApi.updatePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("비밀번호 변경 완료", "새 비밀번호로 다시 로그인해 주세요.");
      router.replace("/(tabs)/settings");
    } catch {
      Alert.alert("변경 실패", "입력 정보를 확인하세요.");
    }
  };

  const deactivate = async () => {
    try {
      await userApi.deactivateMe({ reason: "user_requested" });
      clearSession();
      Alert.alert("계정 비활성화 완료", "계정이 비활성화되었습니다.");
      router.replace("/auth/login");
    } catch {
      Alert.alert("비활성화 실패", "잠시 후 다시 시도하세요.");
    }
  };

  return (
    <View style={{ flex: 1, gap: 12, backgroundColor: "#f4f7fb", padding: 16 }}>
      <BackButton fallback="/(tabs)/settings" />
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>계정</Text>
      <TextInput
        onChangeText={setCurrentPassword}
        placeholder="현재 비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
        value={currentPassword}
      />
      <TextInput
        onChangeText={setNewPassword}
        placeholder="새 비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
        value={newPassword}
      />
      <Pressable onPress={changePassword} style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 12 }}>
        <Text style={{ color: "#ffffff", fontWeight: "900" }}>비밀번호 변경</Text>
      </Pressable>
      <View style={{ height: 1, backgroundColor: "#dbe3ef", marginVertical: 8 }} />
      <Text style={{ color: "#64748b", lineHeight: 20 }}>계정을 비활성화하면 다시 로그인할 수 없습니다.</Text>
      <Pressable onPress={deactivate} style={{ alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", paddingVertical: 12 }}>
        <Text style={{ color: "#b91c1c", fontWeight: "900" }}>계정 비활성화</Text>
      </Pressable>
    </View>
  );
}
