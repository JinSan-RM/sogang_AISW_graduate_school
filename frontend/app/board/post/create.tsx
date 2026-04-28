import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { z } from "zod";
import { useState } from "react";

import BackButton from "../../../components/BackButton";
import { useCreatePost, useUpdatePost } from "../../../hooks/usePosts";
import { mediaApi } from "../../../services/api";
import type { MediaAsset } from "../../../types";

const schema = z.object({
  title: z.string().min(1, "제목을 입력하세요."),
  category: z.string().optional(),
  content: z.string().min(1, "내용을 입력하세요."),
});

type FormValues = z.infer<typeof schema>;

export default function PostCreateScreen() {
  const params = useLocalSearchParams<{
    boardId: string;
    postId?: string;
    title?: string;
    category?: string;
    content?: string;
  }>();

  const boardId = Number(params.boardId);
  const postId = params.postId ? Number(params.postId) : null;

  const createMutation = useCreatePost(boardId);
  const updateMutation = useUpdatePost(postId ?? 0, boardId);
  const [attachments, setAttachments] = useState<MediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: params.title ?? "",
      category: params.category ?? "",
      content: params.content ?? "",
    },
  });

  const attachmentIds = attachments.map((attachment) => attachment.id);

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, category: values.category?.trim() || undefined, attachment_ids: attachmentIds };
    if (postId) {
      updateMutation.mutate(payload, {
        onSuccess: () => router.replace(`/board/post/${postId}`),
      });
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: (res) => {
        router.replace(`/board/post/${res.data.id}`);
      },
    });
  };

  const selectFile = () => {
    if (Platform.OS !== "web") {
      Alert.alert("첨부 불가", "문서 선택 기능을 불러올 수 없습니다. 잠시 후 다시 시도하세요.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        return;
      }
      try {
        setIsUploading(true);
        const uploaded = await Promise.all(files.map((file) => mediaApi.upload(file)));
        setAttachments((current) => [...current, ...uploaded.map((item) => item.data)]);
      } catch {
      Alert.alert("업로드 실패", "파일 업로드를 다시 시도하세요.");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f7fb", padding: 16, gap: 12 }}>
      <BackButton fallback={`/board/${boardId}`} />
        <Text style={{ color: "#112d4e", fontSize: 24, fontWeight: "900" }}>{postId ? "게시글 수정" : "글쓰기"}</Text>

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
                placeholder="분류(선택)"
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
                placeholder="내용"
            value={field.value}
            onChangeText={field.onChange}
            multiline
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 8,
              backgroundColor: "#ffffff",
              padding: 12,
              minHeight: 180,
              textAlignVertical: "top",
            }}
          />
        )}
      />

      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#dbe3ef", backgroundColor: "#ffffff", padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
          <Text style={{ color: "#112d4e", fontWeight: "900" }}>첨부파일</Text>
          <Text style={{ color: "#64748b", marginTop: 3 }}>이미지, PDF, 문서 파일</Text>
          </View>
          <Pressable
            disabled={isUploading}
            onPress={selectFile}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, backgroundColor: "#eff6ff", paddingHorizontal: 12, paddingVertical: 9 }}
          >
            <Ionicons name="attach" size={18} color="#2563eb" />
              <Text style={{ color: "#2563eb", fontWeight: "900" }}>{isUploading ? "업로드 중" : "첨부"}</Text>
          </Pressable>
        </View>
        {attachments.length > 0 ? (
          <View style={{ gap: 8, marginTop: 12 }}>
            {attachments.map((attachment) => (
              <View
                key={attachment.id}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 8, backgroundColor: "#f8fafc", padding: 10 }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: "#111827", fontWeight: "800" }} numberOfLines={1}>
                    {attachment.original_filename}
                  </Text>
                  <Text style={{ color: "#64748b", marginTop: 2 }}>{Math.ceil(attachment.file_size / 1024)} KB</Text>
                </View>
                <Pressable onPress={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                  <Ionicons name="close-circle" size={22} color="#b91c1c" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={handleSubmit(onSubmit)}
        style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#112d4e", paddingVertical: 13 }}
      >
          <Text style={{ color: "#ffffff", fontWeight: "900" }}>{postId ? "변경사항 저장" : "등록"}</Text>
      </Pressable>
    </View>
  );
}
