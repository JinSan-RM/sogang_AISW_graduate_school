import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LegalSection = { title: string; body: string };

export default function LegalDocumentScreen({ title, effectiveDate, version, sections }: { title: string; effectiveDate: string; version?: string; sections: LegalSection[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable accessibilityLabel="뒤로" onPress={() => (router.canGoBack() ? router.back() : router.replace("/auth/login"))} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.iconButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.policyMeta}>
          <Text style={styles.effective}>시행일: {effectiveDate}</Text>
          {version ? <Text style={styles.effective}>버전: {version}</Text> : null}
        </View>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#EEF0F3", paddingHorizontal: 18, paddingBottom: 10 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  content: { padding: 24, paddingBottom: 48, gap: 24 },
  effective: { color: "#6B7280", fontSize: 13 },
  policyMeta: { gap: 4 },
  section: { gap: 8 },
  sectionTitle: { color: "#111827", fontSize: 16, fontWeight: "900" },
  body: { color: "#4B5563", fontSize: 14, lineHeight: 23 },
});
