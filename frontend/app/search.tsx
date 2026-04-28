import { useState } from "react";
import { Button, FlatList, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { searchApi } from "../services/api";
import type { SearchResult } from "../types";
import BackButton from "../components/BackButton";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setIsLoading(true);
    try {
      const response = await searchApi.search({ q: query.trim(), page: 1, size: 20 });
      setResults(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ gap: 12, padding: 16 }}>
      <BackButton />
      <Text style={{ fontSize: 24, fontWeight: "700" }}>검색</Text>
      <TextInput
        onChangeText={setQuery}
        onSubmitEditing={runSearch}
        placeholder="검색어 입력"
        style={{ borderWidth: 1, padding: 12 }}
        value={query}
      />
      <Button disabled={isLoading} onPress={runSearch} title={isLoading ? "검색 중..." : "검색"} />
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Text onPress={() => router.push(`/board/post/${item.id}`)} style={{ borderBottomWidth: 1, paddingVertical: 12 }}>
            {item.title} - {item.board_name}
          </Text>
        )}
      />
    </View>
  );
}
