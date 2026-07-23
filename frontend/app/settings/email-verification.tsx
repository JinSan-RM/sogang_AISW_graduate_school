import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMeQuery } from "../../hooks/useApi";

const COLORS = {
  text: "#15171C",
  label: "#6B7280",
  border: "#E1E4E9",
  fieldBg: "#F7F8FA",
  green: "#2E9E5B",
  bg: "#FFFFFF",
};

export default function EmailVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useMeQuery();
  const me = data?.data;

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
        <Text style={styles.appBarTitle}>학교 이메일 인증 정보</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>학교 이메일</Text>
          <View style={styles.field}>
            <Ionicons name="mail-outline" size={18} color={COLORS.label} />
            <Text style={styles.fieldText}>{me?.email ?? "이메일 정보를 불러오는 중입니다."}</Text>
          </View>
        </View>

        <View style={styles.verifiedRow}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
          <Text style={styles.verifiedText}>인증된 학교 이메일입니다.</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  appBarTitle: { color: COLORS.text, fontSize: 18, fontWeight: "500" },
  scroller: { flex: 1 },
  content: { paddingTop: 12, paddingHorizontal: 16, gap: 12 },
  fieldGroup: { gap: 8 },
  label: { color: COLORS.label, fontSize: 13, fontWeight: "400" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.fieldBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldText: { color: COLORS.text, fontSize: 14, fontWeight: "400" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedText: { color: COLORS.green, fontSize: 13, fontWeight: "400" },
});
