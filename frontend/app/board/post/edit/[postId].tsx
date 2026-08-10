import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { useBoardsQuery } from "../../../../hooks/useApi";
import { usePostDetail, useUpdatePost } from "../../../../hooks/usePosts";
import LoadingState from "../../../../components/LoadingState";
import type { MediaAsset } from "../../../../types";
import { pickAndUploadImages } from "../../../../utils/mediaPicker";

const COLORS = {
  primary: "#2761FF",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#9CA3AF",
  border: "#E1E4E9",
  surface: "#FFFFFF",
  danger: "#EF4444",
  danger50: "#FFF5F5",
};

const schema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요"),
  category: z.string().optional(),
  content: z.string().optional(),
  contact: z.string().optional(),
  applicationUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PostEditScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = Number(params.postId);
  const { data, isError, isLoading, refetch } = usePostDetail(postId);
  const post = data?.data;
  const { data: boardsRes } = useBoardsQuery();
  const board = boardsRes?.data.flatMap((group) => group.boards).find((item) => item.id === post?.board_id);
  const isStudyRecruit = board?.slug === "study-recruit";
  const isAdminParticipationPost = board?.slug === "club-promo" || board?.slug === "networking-programs";
  const isAlbum = board?.board_type === "album";
  const isMutualAid = board?.board_type === "mutual_aid";
  const isActivityCertification = board?.board_type === "activity_certification";
  const updateMutation = useUpdatePost(postId, post?.board_id ?? 0);
  const [attachments, setAttachments] = useState<MediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit, reset, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "", content: "", contact: "", applicationUrl: "" },
  });

  useEffect(() => {
    if (!post) return;
    reset({
      title: post.title,
      category: post.category ?? "",
      content: post.content,
      contact: typeof post.metadata?.contact === "string" ? post.metadata.contact : "",
      applicationUrl: typeof post.metadata?.application_url === "string" ? post.metadata.application_url : "",
    });
    setAttachments(post.attachments);
  }, [post, reset]);

  useEffect(() => {
    if (!post || !isActivityCertification) return;
    router.replace(`/board/post/create?boardId=${post.board_id}&postId=${post.id}` as never);
  }, [isActivityCertification, post]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/board/post/${postId}`);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadErrorText}>게시글을 불러오지 못했습니다.</Text>
        <Pressable accessibilityRole="button" onPress={() => void refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (isActivityCertification) {
    return <LoadingState message="활동인증 수정 화면으로 이동하고 있어요" />;
  }

  const onSubmit = (values: FormValues) => {
    const content = values.content?.trim() ?? "";
    if (!isAlbum && !isMutualAid && !content) {
      setError("content", { message: "내용을 입력해주세요" });
      return;
    }
    if (isStudyRecruit && !values.contact?.trim()) {
      setError("contact", { message: "연락 수단을 입력해주세요" });
      return;
    }
    if (isAdminParticipationPost) {
      const applicationUrl = values.applicationUrl?.trim() ?? "";
      if (!applicationUrl) {
        setError("applicationUrl", { message: "참여 버튼 링크를 입력해주세요" });
        return;
      }
      try {
        const parsed = new URL(applicationUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("INVALID_PROTOCOL");
      } catch {
        setError("applicationUrl", { message: "http:// 또는 https://로 시작하는 올바른 주소를 입력해주세요" });
        return;
      }
      if (!attachments.some((attachment) => attachment.content_type.startsWith("image/"))) {
        Alert.alert("대표 사진", "동아리 게시글에는 사진을 1장 이상 첨부해야 합니다.");
        return;
      }
    }

    updateMutation.mutate(
      {
        title: values.title.trim(),
        content: isAlbum ? values.title.trim() : content,
        category: values.category?.trim() || undefined,
        metadata: isStudyRecruit
          ? {
              ...(post.metadata ?? {}),
              recruitment_status: values.category === "마감" ? "closed" : "open",
              contact: values.contact?.trim() ?? "",
            }
          : isAdminParticipationPost
            ? {
                ...(post.metadata ?? {}),
                application_url: values.applicationUrl?.trim() ?? "",
              }
          : post.metadata,
        attachment_ids: attachments.map((attachment) => attachment.id),
        is_anonymous: post.is_anonymous,
      },
      {
        onSuccess: goBack,
        onError: () => Alert.alert("저장 실패", "작성자 또는 관리자만 이 게시글을 수정할 수 있습니다."),
      }
    );
  };

  const selectImages = async () => {
    try {
      setIsUploading(true);
      const uploaded = await pickAndUploadImages();
      if (uploaded.length > 0) {
        setAttachments((current) => [...current, ...uploaded]);
      }
    } catch {
      Alert.alert("업로드 실패", "사진 업로드를 다시 시도하세요.");
    } finally {
      setIsUploading(false);
    }
  };

  const boardLabel = post.category?.trim() || board?.name || "게시판";

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable accessibilityLabel="닫기" onPress={goBack} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.appBarTitle}>글 수정</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroller} contentContainerStyle={styles.content}>
        <View style={styles.readOnlyField}>
          <Text numberOfLines={1} style={styles.readOnlyText}>{boardLabel}</Text>
        </View>

        {isStudyRecruit ? (
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <View>
                <Text style={styles.fieldLabel}>모집 상태</Text>
                <View style={styles.statusRow}>
                  {["진행중", "마감"].map((status) => {
                    const selected = field.value === status;
                    return (
                      <Pressable key={status} onPress={() => field.onChange(status)} style={[styles.statusButton, selected ? styles.statusButtonSelected : null]}>
                        <Text style={[styles.statusText, selected ? styles.statusTextSelected : null]}>{status}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <View>
              <Text style={styles.fieldLabel}>제목</Text>
              <TextInput
                accessibilityLabel="제목"
                multiline
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="제목을 입력하세요"
                placeholderTextColor={COLORS.subtle}
                style={[styles.input, styles.titleInput, fieldState.error ? styles.inputError : null]}
                textAlignVertical="top"
                value={field.value}
              />
              {fieldState.error ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
            </View>
          )}
        />

        {!isAlbum ? (
          <Controller
            control={control}
            name="content"
            render={({ field, fieldState }) => (
              <View>
                <Text style={styles.fieldLabel}>내용</Text>
                <TextInput
                  accessibilityLabel="내용"
                  multiline
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  placeholder="내용을 입력하세요"
                  placeholderTextColor={COLORS.subtle}
                  style={[styles.input, styles.contentInput, fieldState.error ? styles.inputError : null]}
                  textAlignVertical="top"
                  value={field.value}
                />
                {fieldState.error ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
              </View>
            )}
          />
        ) : null}

        {isStudyRecruit ? (
          <Controller
            control={control}
            name="contact"
            render={({ field, fieldState }) => (
              <View>
                <Text style={styles.fieldLabel}>스터디장 연락수단</Text>
                <TextInput
                  accessibilityLabel="연락 수단"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  placeholder="스터디장 연락 수단"
                  placeholderTextColor={COLORS.subtle}
                  style={[styles.input, fieldState.error ? styles.inputError : null]}
                  value={field.value}
                />
                {fieldState.error ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
              </View>
            )}
          />
        ) : null}

        {isAdminParticipationPost ? (
          <>
            <Controller
              control={control}
              name="applicationUrl"
              render={({ field, fieldState }) => (
                <View>
                  <Text style={styles.fieldLabel}>참여 버튼 링크</Text>
                  <TextInput
                    accessibilityLabel="참여 버튼 링크"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    placeholder="https://forms.gle/..."
                    placeholderTextColor={COLORS.subtle}
                    style={[styles.input, fieldState.error ? styles.inputError : null]}
                    value={field.value}
                  />
                  {fieldState.error ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
                </View>
              )}
            />

            <View style={styles.photoBox}>
              <View style={styles.photoHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>대표 사진</Text>
                  <Text style={styles.helperText}>목록과 상세 상단에 표시할 사진을 1장 이상 첨부하세요.</Text>
                </View>
                <Pressable disabled={isUploading} onPress={selectImages} style={styles.photoAddButton}>
                  <Ionicons name="image-outline" size={17} color={COLORS.primary} />
                  <Text style={styles.photoAddText}>{isUploading ? "업로드 중" : "사진 추가"}</Text>
                </Pressable>
              </View>
              {attachments.map((attachment) => (
                <View key={attachment.id} style={styles.photoRow}>
                  <Text numberOfLines={1} style={styles.photoName}>{attachment.original_filename}</Text>
                  <Pressable hitSlop={8} onPress={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                    <Ionicons name="close-circle" size={19} color={COLORS.subtle} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Pressable
          disabled={updateMutation.isPending || isUploading}
          onPress={handleSubmit(onSubmit)}
          style={[styles.submitButton, updateMutation.isPending || isUploading ? styles.submitButtonDisabled : null]}
        >
          <Text style={styles.submitText}>{updateMutation.isPending || isUploading ? "저장 중" : "완료"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
  },
  loadErrorText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  retryButton: {
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E4E9",
    paddingHorizontal: 16,
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
    fontWeight: "500",
  },
  scroller: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  readOnlyField: {
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  statusButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#EDF2FE",
  },
  statusText: {
    color: COLORS.muted,
    fontWeight: "800",
  },
  statusTextSelected: {
    color: COLORS.primary,
  },
  input: {
    minHeight: 46,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleInput: {
    height: 100,
  },
  contentInput: {
    height: 116,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger50,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 5,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 7,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  photoBox: {
    gap: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 13,
  },
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  photoAddButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 7,
    paddingHorizontal: 11,
  },
  photoAddText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  photoRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 7,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 10,
  },
  photoName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  submitButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
});
