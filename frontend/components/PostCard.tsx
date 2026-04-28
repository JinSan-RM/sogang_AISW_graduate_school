import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { PostListItem } from "../types";

type Props = {
  post: PostListItem;
  onPress: (postId: number) => void;
};

export default function PostCard({ post, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(post.id)}>
      <View
        style={{
          marginHorizontal: 14,
          marginBottom: 10,
          padding: 14,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#dbe3ef",
          backgroundColor: "#ffffff",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {post.is_pinned || post.is_notice ? (
        <Text style={{ color: "#b91c1c", fontSize: 12, fontWeight: "900" }}>고정</Text>
          ) : null}
          {post.category ? <Text style={{ color: "#2563eb", fontSize: 12, fontWeight: "800" }}>{post.category}</Text> : null}
          {post.status && post.status !== "published" ? (
            <Text style={{ color: "#0f766e", fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{post.status}</Text>
          ) : null}
        </View>
        <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900" }} numberOfLines={1}>
          {post.title}
        </Text>
        <Text style={{ color: "#475569", marginTop: 6, lineHeight: 19 }} numberOfLines={2}>
          {post.content_preview}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
          <Text style={{ color: "#64748b", fontSize: 12 }}>{post.author_nickname}</Text>
          <Text style={{ color: "#94a3b8", fontSize: 12 }}>{new Date(post.created_at).toLocaleDateString()}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="heart-outline" size={14} color="#64748b" />
            <Text style={{ color: "#64748b", fontSize: 12 }}>{post.like_count}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="chatbubble-outline" size={14} color="#64748b" />
            <Text style={{ color: "#64748b", fontSize: 12 }}>{post.comment_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
