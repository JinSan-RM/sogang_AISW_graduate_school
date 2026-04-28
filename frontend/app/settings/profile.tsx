import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import BackButton from "../../components/BackButton";
import { userApi } from "../../services/api";

export default function ProfileSettingsScreen() {
  const [nickname, setNickname] = useState("");
  const [cohort, setCohort] = useState("");
  const [major, setMajor] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [position, setPosition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    userApi.getMe().then((response) => {
      setNickname(response.data.nickname ?? "");
      setCohort(response.data.cohort ?? "");
      setMajor(response.data.major ?? "");
      setPhone(response.data.phone ?? "");
      setCompany(response.data.company ?? "");
      setJobTitle(response.data.job_title ?? "");
      setPosition(response.data.position ?? "");
    });
  }, []);

  const save = async () => {
    try {
      setIsSubmitting(true);
      await userApi.updateMe({
        nickname,
        cohort,
        major,
        phone,
        company,
        job_title: jobTitle,
        position,
      });
      Alert.alert("저장 완료", "프로필이 저장되었습니다.");
      router.replace("/(tabs)/settings");
    } catch {
      Alert.alert("저장 실패", "입력한 정보를 확인하세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, gap: 10, backgroundColor: "#f4f7fb", padding: 16 }}>
      <BackButton fallback="/(tabs)/settings" />
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>프로필</Text>
      {[
        ["닉네임", nickname, setNickname],
        ["기수", cohort, setCohort],
        ["전공", major, setMajor],
        ["연락처", phone, setPhone],
        ["회사", company, setCompany],
        ["직무", jobTitle, setJobTitle],
        ["직책", position, setPosition],
      ].map(([label, value, setter]) => (
        <TextInput
          key={label as string}
          onChangeText={setter as (next: string) => void}
          placeholder={label as string}
          style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
          value={value as string}
        />
      ))}
      <Pressable
        disabled={isSubmitting}
        onPress={save}
        style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 12 }}
      >
          <Text style={{ color: "#ffffff", fontWeight: "900" }}>프로필 저장</Text>
      </Pressable>
    </View>
  );
}
