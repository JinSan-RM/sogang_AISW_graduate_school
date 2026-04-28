import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { z } from "zod";

import BackButton from "../../../../components/BackButton";
import { usePostDetail, useUpdatePost } from "../../../../hooks/usePosts";
import type { MediaAsset } from "../../../../types";

const schema = z.object({
  title: z.string().min(1, "제목을 입력하세요."),
  category: z.string().optional(),
  content: z.string().min(1, "내용을 입력하세요."),
});

type FormValues = z.infer<typeof schema>;

export default function PostEditScreen() {
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = Number(params.postId);
  const { data, isLoading } = usePostDetail(postId);
  const post = data?.data;
  const updateMutation = useUpdatePost(postId, post?.board_id ?? 0);
  const [attachments, setAttachments] = useState<MediaAsset[]>([]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "", content: "" },
  });

  useEffect(() => {
    if (!post) {
      return;
    }
    reset({
      title: post.title,
      category: post.category ?? "",
      content: post.content,
    });
    setAttachments(post.attachments);
  }, [post?.id, post?.title, post?.category, post?.content, reset]);

  if (isLoading || !post) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f7fb" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      {
        title: values.title,
        content: values.content,
        category: values.category?.trim() || undefined,
        attachment_ids: attachments.map((attachment) => attachment.id),
        is_anonymous: post.is_anonymous,
      },
      {
        onSuccess: () => router.replace(`/board/post/${post.id}`),
        onError: () => Alert.alert("저장 실패", "작성자 또는 관리자만 이 게시글을 수정할 수 있습니다."),
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f7fb", padding: 16, gap: 12 }}>
      <BackButton fallback={`/board/post/${post.id}`} />
      <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>게시글 수정</Text>

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextInput
            placeholder="제목"
            value={field.value}
            onChangeText={field.onChange}
            style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
          />
        )}
      />
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <TextInput
            placeholder="분류"
            value={field.value}
            onChangeText={field.onChange}
            style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}
          />
        )}
      />
      <Controller
        control={control}
        name="content"
        render={({ field }) => (
          <TextInput
            multiline
            placeholder="내용"
            value={field.value}
            onChangeText={field.onChange}
            style={{ minHeight: 200, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#ffffff", padding: 12, textAlignVertical: "top" }}
          />
        )}
      />

      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
        <Text style={{ color: "#112d4e", fontWeight: "900" }}>첨부파일</Text>
        {attachments.length === 0 ? <Text style={{ color: "#64748b" }}>첨부파일이 없습니다.</Text> : null}
        {attachments.map((attachment) => (
          <View key={attachment.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, backgroundColor: "#f8fafc", padding: 10 }}>
            <Ionicons name="document-attach-outline" size={18} color="#2563eb" />
            <Text style={{ flex: 1, color: "#111827", fontWeight: "800" }} numberOfLines={1}>
              {attachment.original_filename}
            </Text>
            <Pressable onPress={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
              <Ionicons name="close-circle" size={22} color="#b91c1c" />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        disabled={updateMutation.isPending}
        onPress={handleSubmit(onSubmit)}
        style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 13 }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "900" }}>{updateMutation.isPending ? "저장 중" : "변경사항 저장"}</Text>
      </Pressable>
    </View>
  );
}
