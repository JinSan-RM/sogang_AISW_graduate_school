import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_ORIGIN, registrationApi, userApi } from "../../services/api";
import { pickAndUploadImage } from "../../utils/mediaPicker";
import { apiErrorCode, phoneError } from "../../utils/authValidation";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#A0A7B2",
  border: "#E5E7EB",
  bg: "#FFFFFF",
  danger: "#FF6B6B",
};

type FieldValues = {
  nickname: string;
  cohort: string;
  major: string;
  phone: string;
};

function mediaUrl(value?: string | null) {
  if (!value) return null;
  return value.startsWith("http") ? value : `${API_ORIGIN}${value}`;
}

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const registrationOptionsQuery = useQuery({
    queryKey: ["registration-options"],
    queryFn: registrationApi.getOptions,
    staleTime: 60_000,
  });
  const majorOptions = registrationOptionsQuery.data?.data.majors ?? [];
  const [fields, setFields] = useState<FieldValues>({
    nickname: "",
    cohort: "",
    major: "",
    phone: "",
  });
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fieldError, setFieldError] = useState("");
  const [majorModalVisible, setMajorModalVisible] = useState(false);

  useEffect(() => {
    userApi.getMe().then((response) => {
      setFields({
        nickname: response.data.nickname ?? "",
        cohort: response.data.cohort ?? "",
        major: response.data.major ?? "",
        phone: response.data.phone ?? "",
      });
      setProfileImageUrl(response.data.profile_image_url ?? null);
    });
  }, []);

  const selectProfileImage = async () => {
    try {
      setIsUploadingImage(true);
      setUploadProgress(0);
      const image = await pickAndUploadImage(setUploadProgress);
      if (image) {
        setProfileImageUrl(image.url ?? null);
      }
    } catch {
      Alert.alert("이미지 업로드 실패", "사진 접근 권한 또는 업로드 상태를 확인해주세요.");
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const save = async () => {
    if (!fields.major || !majorOptions.some((option) => option.name === fields.major)) {
      setFieldError("관리자가 등록한 전공 중 하나를 선택해주세요.");
      return;
    }
    const nextPhoneError = fields.phone ? phoneError(fields.phone.replace(/\D/g, "")) : null;
    if (nextPhoneError) {
      setFieldError(nextPhoneError);
      return;
    }
    try {
      setIsSubmitting(true);
      await userApi.updateMe({
        major: fields.major,
        phone: fields.phone,
        profile_image_url: profileImageUrl,
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      Alert.alert("저장 완료", "프로필이 저장되었습니다.");
      router.replace("/(tabs)/settings");
    } catch (error) {
      setFieldError(
        apiErrorCode(error) === "VALIDATION_ERROR"
          ? "현재 선택할 수 있는 전공을 다시 선택해주세요."
          : "입력한 정보를 확인해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const image = mediaUrl(profileImageUrl);
  const cohortLabel = fields.cohort
    ? fields.cohort.endsWith("기")
      ? fields.cohort
      : `${fields.cohort}기`
    : "-";
  const saveDisabled = isSubmitting || registrationOptionsQuery.isLoading || majorOptions.length === 0;

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
        <Text style={styles.appBarTitle}>프로필 수정</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <Pressable disabled={isUploadingImage} onPress={selectProfileImage} style={styles.avatarButton}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{fields.nickname.slice(0, 1) || "?"}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
          {isUploadingImage ? <Text style={styles.uploadText}>업로드 {uploadProgress || 0}%</Text> : null}
          {profileImageUrl ? (
            <Pressable onPress={() => setProfileImageUrl(null)} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>사진 제거</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>이름</Text>
            <View style={styles.lockedInput}>
              <Text style={styles.lockedInputText}>{fields.nickname || "-"}</Text>
              <Ionicons name="lock-closed-outline" size={17} color={COLORS.subtle} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>기수</Text>
            <View style={styles.lockedInput}>
              <Text style={styles.lockedInputText}>{cohortLabel}</Text>
              <Ionicons name="lock-closed-outline" size={17} color={COLORS.subtle} />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>전공</Text>
            <Pressable
              accessibilityRole="button"
              disabled={registrationOptionsQuery.isLoading || majorOptions.length === 0}
              onPress={() => setMajorModalVisible(true)}
              style={styles.selectInput}
            >
              <Text style={[styles.selectInputText, !fields.major ? styles.selectPlaceholder : null]}>
                {fields.major || "전공 선택"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.subtle} />
            </Pressable>
            {registrationOptionsQuery.isError ? <Text style={styles.errorText}>전공 목록을 불러오지 못했습니다.</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>연락처</Text>
            <TextInput
              keyboardType="phone-pad"
              maxLength={11}
              onChangeText={(next) => {
                setFields((current) => ({ ...current, phone: next.replace(/\D/g, "").slice(0, 11) }));
                setFieldError("");
              }}
              placeholder="연락처"
              placeholderTextColor={COLORS.subtle}
              style={styles.input}
              value={fields.phone}
            />
          </View>
        </View>

        {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}

        <Pressable disabled={saveDisabled} onPress={save} style={[styles.primaryButton, saveDisabled ? styles.disabledButton : null]}>
          <Text style={styles.primaryButtonText}>{isSubmitting ? "저장 중" : "완료"}</Text>
        </Pressable>
      </ScrollView>

      <Modal animationType="slide" transparent visible={majorModalVisible} onRequestClose={() => setMajorModalVisible(false)}>
        <Pressable onPress={() => setMajorModalVisible(false)} style={styles.modalBackdrop}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>전공 선택</Text>
            {majorOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  setFields((current) => ({ ...current, major: option.name }));
                  setFieldError("");
                  setMajorModalVisible(false);
                }}
                style={styles.modalOption}
              >
                <Text style={styles.modalOptionText}>{option.name}</Text>
                {fields.major === option.name ? <Ionicons name="checkmark" size={19} color={COLORS.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
  scroller: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 42,
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
  },
  avatarButton: {
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 48,
    backgroundColor: COLORS.primary50,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary50,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: "900",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  uploadText: {
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
  },
  removeButton: {
    paddingTop: 9,
  },
  removeButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  errorText: { color: COLORS.danger, fontSize: 12, fontWeight: "800", marginTop: 10 },
  form: {
    gap: 10,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
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
  lockedInput: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    backgroundColor: "#F6F7F9",
    paddingHorizontal: 15,
  },
  lockedInputText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: "700",
  },
  selectInput: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  selectInputText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  selectPlaceholder: {
    color: COLORS.subtle,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17,24,39,0.38)",
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  modalOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
  },
  modalOptionText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
