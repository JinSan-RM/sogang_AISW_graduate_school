import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";

import BackButton from "../../../components/BackButton";
import CommentItem from "../../../components/CommentItem";
import {
  useCreateComment,
  useDeleteComment,
  useDeletePost,
  usePostComments,
  usePostDetail,
  useToggleBookmark,
  useToggleLike,
  useUpdateSuggestion,
  useUpdateComment,
} from "../../../hooks/usePosts";
import { useUserStore } from "../../../stores/userStore";
import { API_ORIGIN, reportApi } from "../../../services/api";

const COLORS = {
  navy: "#112d4e",
  blue: "#2563eb",
  red: "#b91c1c",
  bg: "#f4f7fb",
  border: "#dbe3ef",
  text: "#111827",
  muted: "#64748b",
};

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = Number(params.postId);
  const userId = useUserStore((state) => state.userId);
  const currentUser = useUserStore((state) => state.user);

  const { data: postRes, isLoading } = usePostDetail(postId);
  const { data: commentRes } = usePostComments(postId);

  const post = postRes?.data;
  const comments = commentRes?.data ?? [];

  const [commentText, setCommentText] = useState("");
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: number; label: string } | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reportDetail, setReportDetail] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [reportedTargets, setReportedTargets] = useState<Record<string, boolean>>({});
  const [suggestionStatus, setSuggestionStatus] = useState("received");
  const [suggestionReply, setSuggestionReply] = useState("");

  const likeMutation = useToggleLike(postId, post?.board_id ?? 0);
  const bookmarkMutation = useToggleBookmark(postId);
  const createCommentMutation = useCreateComment(postId);
  const updateCommentMutation = useUpdateComment(postId);
  const deleteCommentMutation = useDeleteComment(postId);
  const deletePostMutation = useDeletePost(postId, post?.board_id ?? 0);
  const updateSuggestionMutation = useUpdateSuggestion(postId);

  useEffect(() => {
    if (!post) {
      return;
    }
    setIsLiked(post.is_liked);
    setIsBookmarked(post.is_bookmarked);
    setLikeCount(post.like_count);
    setSuggestionStatus(post.suggestion?.status ?? post.status ?? "received");
    setSuggestionReply(post.suggestion?.admin_reply ?? "");
  }, [
    post?.id,
    post?.is_liked,
    post?.is_bookmarked,
    post?.like_count,
    post?.status,
    post?.suggestion?.status,
    post?.suggestion?.admin_reply,
  ]);

  if (isLoading || !post) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isMine = post.author_id === userId;
  const isAdmin = currentUser?.role === "admin";

  const requireLogin = () => {
    if (!userId) {
      router.push("/auth/login");
      return false;
    }
    return true;
  };

  const handleLike = async () => {
    if (!requireLogin() || likeMutation.isPending) {
      return;
    }
    try {
      const response = await likeMutation.mutateAsync();
      setIsLiked(response.data.is_liked);
      setLikeCount(response.data.like_count);
    } catch {
      Alert.alert("수정 실패", "댓글을 수정할 수 없습니다.");
    }
  };

  const handleBookmark = async () => {
    if (!requireLogin() || bookmarkMutation.isPending) {
      return;
    }
    try {
      const response = await bookmarkMutation.mutateAsync();
      setIsBookmarked(response.data.is_bookmarked);
    } catch {
      Alert.alert("삭제 실패", "댓글을 삭제할 수 없습니다.");
    }
  };

  const submitReport = async () => {
    if (!reportTarget || !requireLogin()) {
      return;
    }
    try {
      setIsReporting(true);
      const payload = { reason: reportReason, detail: reportDetail.trim() || undefined };
      const response =
        reportTarget.type === "post"
          ? await reportApi.reportPost(reportTarget.id, payload)
          : await reportApi.reportComment(reportTarget.id, payload);
      setReportedTargets((current) => ({ ...current, [`${reportTarget.type}:${reportTarget.id}`]: true }));
      setReportTarget(null);
      setReportDetail("");
      Alert.alert(response.data.duplicate ? "이미 신고됨" : "신고 접수 완료", "검토 후 조치하겠습니다.");
    } catch {
      Alert.alert("신고 실패", "신고 내용을 확인하거나 잠시 후 다시 시도하세요.");
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <View style={{ marginBottom: 12 }}>
        <BackButton fallback={`/board/${post.board_id}`} />
      </View>
      <View style={{ borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: COLORS.border, padding: 18 }}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {post.is_pinned || post.is_notice ? (
        <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: "800" }}>삭제됨</Text>
          ) : null}
          {post.category ? <Text style={{ color: COLORS.blue, fontSize: 12, fontWeight: "800" }}>{post.category}</Text> : null}
          {post.status && post.status !== "published" ? (
            <Text style={{ color: "#0f766e", fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{post.status}</Text>
          ) : null}
        </View>
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: "800", lineHeight: 30 }}>{post.title}</Text>
        <Text style={{ marginTop: 8, color: COLORS.muted }}>
          {post.author_nickname} | {new Date(post.created_at).toLocaleString()}
        </Text>
        <Text style={{ marginTop: 18, color: COLORS.text, fontSize: 16, lineHeight: 25 }}>{post.content}</Text>

        {post.suggestion ? (
          <View style={{ marginTop: 18, borderRadius: 8, borderWidth: 1, borderColor: "#99f6e4", backgroundColor: "#f0fdfa", padding: 14 }}>
            <Text style={{ color: "#0f766e", fontSize: 16, fontWeight: "900" }}>제안 답변 등록</Text>
            <Text style={{ color: COLORS.text, marginTop: 6, fontWeight: "800", textTransform: "capitalize" }}>
              {post.suggestion.status}
            </Text>
            {post.suggestion.admin_reply ? (
              <View style={{ marginTop: 10, borderRadius: 8, backgroundColor: "#ffffff", padding: 12 }}>
            <Text style={{ color: COLORS.navy, fontWeight: "900" }}>답변 상태</Text>
                <Text style={{ color: COLORS.text, marginTop: 8, lineHeight: 22 }}>{post.suggestion.admin_reply}</Text>
                {post.suggestion.replied_at ? (
                  <Text style={{ color: COLORS.muted, marginTop: 8 }}>{new Date(post.suggestion.replied_at).toLocaleString()}</Text>
                ) : null}
              </View>
            ) : null}
            {isAdmin ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {["received", "reviewing", "answered", "closed"].map((status) => (
                    <Pressable
                      key={status}
                      onPress={() => setSuggestionStatus(status)}
                      style={{
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: suggestionStatus === status ? "#0f766e" : "#99f6e4",
                        backgroundColor: suggestionStatus === status ? "#ccfbf1" : "#ffffff",
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                      }}
                    >
                      <Text style={{ color: suggestionStatus === status ? "#0f766e" : COLORS.muted, fontWeight: "800", textTransform: "capitalize" }}>
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  multiline
                  onChangeText={setSuggestionReply}
                  placeholder="공식 답변"
                  style={{ minHeight: 86, borderWidth: 1, borderColor: "#99f6e4", borderRadius: 8, backgroundColor: "#ffffff", padding: 10 }}
                  value={suggestionReply}
                />
                <Pressable
                  disabled={updateSuggestionMutation.isPending}
                  onPress={() =>
                    updateSuggestionMutation.mutate(
                      { status: suggestionStatus, admin_reply: suggestionReply.trim() || undefined },
                { onSuccess: () => Alert.alert("답변 저장", "공식 답변 상태가 저장되었습니다.") }
                    )
                  }
                  style={{ alignItems: "center", borderRadius: 8, backgroundColor: "#0f766e", paddingVertical: 11 }}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "900" }}>
                {updateSuggestionMutation.isPending ? "저장 중" : "답변 저장"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {post.attachments.length > 0 ? (
          <View style={{ gap: 10, marginTop: 18 }}>
          <Text style={{ color: COLORS.navy, fontWeight: "900" }}>첨부파일</Text>
            {post.attachments.map((attachment) => {
              const url = attachment.url?.startsWith("http") ? attachment.url : `${API_ORIGIN}${attachment.url ?? ""}`;
              const isImage = attachment.content_type.startsWith("image/");
              return (
                <Pressable
                  key={attachment.id}
                  onPress={() => {
                    if (attachment.url) {
                      Linking.openURL(url);
                    }
                  }}
                  style={{ borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#f8fafc", padding: 10 }}
                >
                  {isImage && attachment.url ? (
                    <Image source={{ uri: url }} style={{ width: "100%", height: 220, borderRadius: 8, marginBottom: 8, backgroundColor: "#e5e7eb" }} />
                  ) : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={isImage ? "image-outline" : "document-attach-outline"} size={18} color={COLORS.blue} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: "800" }} numberOfLines={1}>
                        {attachment.original_filename}
                      </Text>
                      <Text style={{ color: COLORS.muted, marginTop: 2 }}>{Math.ceil(attachment.file_size / 1024)} KB</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
          <TouchableOpacity
            activeOpacity={0.75}
            disabled={likeMutation.isPending}
            onPress={handleLike}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isLiked ? COLORS.blue : COLORS.border,
              backgroundColor: isLiked ? "#eff6ff" : "#ffffff",
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? COLORS.blue : COLORS.muted} />
            <Text style={{ color: isLiked ? COLORS.blue : COLORS.text, fontWeight: "800" }}>{likeCount}</Text>
              <Text style={{ color: isLiked ? COLORS.blue : COLORS.muted, fontWeight: "800" }}>{isLiked ? "좋아요 취소" : "좋아요"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            disabled={bookmarkMutation.isPending}
            onPress={handleBookmark}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isBookmarked ? COLORS.blue : COLORS.border,
              backgroundColor: isBookmarked ? "#eff6ff" : "#ffffff",
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={18}
              color={isBookmarked ? COLORS.blue : COLORS.muted}
            />
            <Text style={{ color: isBookmarked ? COLORS.blue : COLORS.text, fontWeight: "800" }}>
              {isBookmarked ? "북마크됨" : "북마크"}
            </Text>
          </TouchableOpacity>

          {isMine ? (
            <>
              <Pressable
                onPress={() =>
                  router.push(`/board/post/edit/${post.id}`)
                }
                style={{ borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 9 }}
              >
            <Text style={{ color: COLORS.text, fontWeight: "800" }}>수정</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  deletePostMutation.mutate(undefined, {
                    onSuccess: () => router.replace(`/board/${post.board_id}`),
                  })
                }
                style={{ borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 12, paddingVertical: 9 }}
              >
            <Text style={{ color: COLORS.red, fontWeight: "800" }}>삭제</Text>
              </Pressable>
            </>
          ) : reportedTargets[`post:${post.id}`] ? (
            <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 9 }}>
            <Text style={{ color: "#15803d", fontWeight: "800" }}>신고됨</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setReportTarget({ type: "post", id: post.id, label: "이 게시글" })}
              style={{ borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 12, paddingVertical: 9 }}
            >
            <Text style={{ color: COLORS.red, fontWeight: "800" }}>신고</Text>
            </Pressable>
          )}
        </View>
      </View>

      {reportTarget ? (
        <View style={{ marginTop: 14, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff7f7", padding: 14 }}>
              <Text style={{ color: COLORS.red, fontSize: 16, fontWeight: "900" }}>{reportTarget.label} 신고</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {["inappropriate", "spam", "harassment", "privacy", "other"].map((reason) => (
              <Pressable
                key={reason}
                onPress={() => setReportReason(reason)}
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: reportReason === reason ? COLORS.red : "#fecaca",
                  backgroundColor: reportReason === reason ? "#fee2e2" : "#ffffff",
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: reportReason === reason ? COLORS.red : COLORS.muted, fontWeight: "800" }}>{reason}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            onChangeText={setReportDetail}
                  placeholder="신고 사유(선택)"
            style={{ minHeight: 76, marginTop: 10, borderWidth: 1, borderColor: "#fecaca", borderRadius: 8, backgroundColor: "#ffffff", padding: 10 }}
            value={reportDetail}
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable
              onPress={submitReport}
              disabled={isReporting}
              style={{ flex: 1, alignItems: "center", borderRadius: 8, backgroundColor: COLORS.red, paddingVertical: 11 }}
            >
                <Text style={{ color: "#ffffff", fontWeight: "900" }}>{isReporting ? "신고 중" : "신고 접수"}</Text>
            </Pressable>
            <Pressable
              onPress={() => setReportTarget(null)}
              style={{ flex: 1, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 11 }}
            >
                <Text style={{ color: COLORS.text, fontWeight: "900" }}>취소</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: 18 }}>
        <Text style={{ color: COLORS.navy, fontSize: 18, fontWeight: "800" }}>댓글 {post.comment_count}</Text>
        {comments.length === 0 ? (
          <View style={{ marginTop: 10, padding: 18, borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.muted }}>등록된 댓글이 없습니다.</Text>
          </View>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={userId}
              onDelete={(commentId) =>
                deleteCommentMutation.mutate(commentId, {
              onError: () => Alert.alert("댓글 실패", "댓글을 저장할 수 없습니다."),
                })
              }
              onEdit={(commentId, content) =>
                updateCommentMutation.mutate(
                  { commentId, content },
                  {
              onError: () => Alert.alert("댓글 실패", "답글을 저장할 수 없습니다."),
                  }
                )
              }
              onReport={setReportTarget}
              reportedTargets={reportedTargets}
              onReply={(commentId) => setReplyParentId(commentId)}
            />
          ))
        )}
      </View>

      <View style={{ marginTop: 18, borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: COLORS.border, padding: 14 }}>
        {replyParentId ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: COLORS.blue, fontWeight: "700" }}>#{replyParentId}</Text>
            <Pressable onPress={() => setReplyParentId(null)}>
              <Text style={{ color: COLORS.muted, fontWeight: "700" }}>취소</Text>
            </Pressable>
          </View>
        ) : null}
        <TextInput
          multiline
              placeholder="댓글 입력"
          value={commentText}
          onChangeText={setCommentText}
          style={{ minHeight: 88, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12, backgroundColor: "#ffffff" }}
        />
        <Pressable
          onPress={() => {
            const trimmed = commentText.trim();
            if (!trimmed) {
              return;
            }
            createCommentMutation.mutate(
              { content: trimmed, parent_id: replyParentId },
              {
                onSuccess: () => {
                  setCommentText("");
                  setReplyParentId(null);
                },
              }
            );
          }}
          style={{ marginTop: 10, alignItems: "center", borderRadius: 8, backgroundColor: COLORS.navy, paddingVertical: 12 }}
        >
            <Text style={{ color: "#ffffff", fontWeight: "800" }}>댓글 등록</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
