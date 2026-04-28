import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { faqApi } from "../services/api";
import type { FAQItem } from "../types";
import BackButton from "../components/BackButton";

export default function FAQScreen() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  useEffect(() => {
    faqApi.getFAQs().then((response) => setFaqs(response.data));
  }, []);

  return (
    <View style={{ padding: 16 }}>
      <BackButton />
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>FAQ</Text>
      <FlatList
        data={faqs}
        keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={<Text>등록된 FAQ가 없습니다.</Text>}
        renderItem={({ item }) => (
          <View style={{ borderBottomWidth: 1, paddingVertical: 12 }}>
            <Text style={{ fontWeight: "700" }}>{item.question}</Text>
            <Text style={{ marginTop: 6 }}>{item.answer}</Text>
          </View>
        )}
      />
    </View>
  );
}
