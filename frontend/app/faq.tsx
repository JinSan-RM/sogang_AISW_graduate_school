import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { faqApi } from "../services/api";
import type { FAQItem } from "../types";

const COLORS = {
  primary: "#2761FF",
  qBadgeBg: "#E6F1FB", // Figma 62:77 Q badge
  qBadgeText: "#0C447C",
  bg: "#FFFFFF",
  border: "#E1E4E9",
  text: "#15171C",
  muted: "#6B7280",
};

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);

  useEffect(() => {
    faqApi
      .getFAQs()
      .then((response) => setFaqs(response.data))
      .finally(() => setIsLoading(false));
  }, []);

  const visibleFAQs = useMemo(() => faqs.filter((item) => item.is_active !== false), [faqs]);

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable accessibilityLabel="뒤로" onPress={() => router.replace("/(tabs)/council" as never)} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>자주 묻는 질문</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroller} contentContainerStyle={styles.content}>
          {visibleFAQs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>등록된 FAQ가 없습니다.</Text>
            </View>
          ) : null}

          {visibleFAQs.map((item) => {
            const expanded = expandedFaqId === item.id;
            return (
              <View key={item.id} style={styles.faqItem}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedFaqId((current) => (current === item.id ? null : item.id))}
                  style={styles.questionRow}
                >
                  <View style={styles.questionBadge}>
                    <Text style={styles.questionBadgeText}>Q</Text>
                  </View>
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#A6ACB7" />
                </Pressable>
                {expanded ? (
                  <View style={styles.answerRow}>
                    <View style={styles.answerBadge}>
                      <Text style={styles.answerBadgeText}>A</Text>
                    </View>
                    <Text style={styles.answerText}>{item.answer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
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
    fontWeight: "500", // Figma: Inter Medium
  },
  scroller: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  faqItem: {
    gap: 8,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  questionBadge: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: COLORS.qBadgeBg,
  },
  questionBadgeText: {
    color: COLORS.qBadgeText,
    fontSize: 11,
    fontWeight: "500",
  },
  answerBadge: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  answerBadgeText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  questionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500", // Figma: Medium
    lineHeight: 20,
  },
  answerText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400", // Figma: Regular
    lineHeight: 20,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
});
