import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CommentItem from "../../../components/CommentItem";
import MediaImage from "../../../components/MediaImage";
import { useBoardsQuery } from "../../../hooks/useApi";
import { resolveMediaAccessUrl } from "../../../hooks/useMediaAccessUrl";
import {
  useCreateComment,
  useDeleteComment,
  useDeletePost,
  usePostComments,
  usePostDetail,
  useToggleBookmark,
  useToggleLike,
  useUpdateComment,
  useUpdateMutualAid,
  useUpdateSuggestion,
} from "../../../hooks/usePosts";
import { reportApi, userApi } from "../../../services/api";
import { useUserStore } from "../../../stores/userStore";
import type { MutualAidStatus } from "../../../types";
import { formatCohortName } from "../../../utils/userLabel";

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#8A919C",
  divider: "#EEF0F3",
  surface: "#FFFFFF",
  page: "#FFFFFF",
  danger: "#B91C1C",
  danger50: "#FFF1F2",
  cyan50: "#E6F9FB",
  cyan700: "#14788A",
  green50: "#EAF8EF",
  green700: "#1F7A46",
  pink50: "#FFEAF1",
  pink700: "#B91C4C",
  yellow50: "#FFF6DC",
  yellow700: "#9A6B00",
};

const ALBUM_FALLBACK_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#2761FF", "#86C8FF"],
  ["#5B49C8", "#B7A4F8"],
  ["#0E7B60", "#55C69A"],
  ["#B94A2F", "#F39A7D"],
];

const NO_COMMENT_RESOURCE_SLUGS = new Set(["lecture-reviews"]);

type ReportTarget = {
  type: "post" | "comment";
  id: number;
  label: string;
};

type IconName = keyof typeof Ionicons.glyphMap;

const REPORT_REASONS = [
  { value: "spam", label: "스팸/광고입니다" },
  { value: "harassment", label: "욕설 및 비방이 포함되어 있어요" },
  { value: "misinformation", label: "허위 정보예요" },
  { value: "other", label: "기타" },
];

const SUGGESTION_STATUSES = [
  { value: "received", label: "대기중" },
  { value: "answered", label: "답변 완료" },
];

const MUTUAL_AID_STATUSES: { value: MutualAidStatus; label: string }[] = [
  { value: "processing", label: "처리중" },
  { value: "completed", label: "처리 완료" },
  { value: "rejected", label: "반려" },
];

function shortDate(value: string) {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  const date = new Date(value.includes("T") && !hasTimezone ? `${value}Z` : value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(2, 10).replace(/-/g, ".");
  }
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}(${weekday})`;
}

function formatDotDate(value: string) {
  const parts = value.trim().split(".").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) return value;
  const [rawYear, rawMonth, rawDay] = parts;
  const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
  const date = new Date(year, Number(rawMonth) - 1, Number(rawDay));
  if (Number.isNaN(date.getTime())) return value;
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}(${weekday})`;
}

function categoryLabel(value?: string | null, fallback = "게시글") {
  const raw = value?.trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes("event") || raw.includes("행사")) return "행사공지";
  if (lower.includes("academic") || raw.includes("학사")) return "학사공지";
  if (raw.includes("전체")) return "공지";
  if (lower === "all" || lower.includes("other") || lower.includes("general") || raw.includes("기타")) return "기타공지";
  return raw.length <= 8 ? raw : fallback;
}

function categoryTone(label: string) {
  if (label.includes("반려")) return { bg: "#FBEAF0", fg: "#993556" };
  if (label.includes("행사") || label.includes("시험") || label.includes("족보")) return { bg: "#FBEAF0", fg: "#993556" };
  if (label.includes("인증") || label.includes("완료")) return { bg: COLORS.green50, fg: COLORS.green700 };
  if (label.includes("대기")) return { bg: COLORS.yellow50, fg: COLORS.yellow700 };
  if (label.includes("건의") || label.includes("답변")) return { bg: COLORS.cyan50, fg: COLORS.cyan700 };
  if (label.includes("후기")) return { bg: "#EEEDFE", fg: "#3C3489" };
  return { bg: "#E6F1FB", fg: "#0C447C" };
}

function isAdminParticipationGuideBoard(board?: { slug?: string } | null) {
  return board?.slug === "club-promo" || board?.slug === "networking-programs";
}

function firstUrlFromText(value: string) {
  return value.match(/https?:\/\/[^\s)]+/)?.[0];
}

function IconButton({ icon, onPress, label, size = 24, color = COLORS.text }: { icon: IconName; onPress: () => void; label: string; size?: number; color?: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ postId: string }>();
  const insets = useSafeAreaInsets();
  const postId = Number(params.postId);
  const userId = useUserStore((state) => state.userId);
  const currentUser = useUserStore((state) => state.user);

  const { data: postRes, isError, isLoading, refetch } = usePostDetail(postId);
  const { data: boardsRes } = useBoardsQuery();

  const post = postRes?.data;
  const boards = boardsRes?.data.flatMap((group) => group.boards) ?? [];
  const board = boards.find((item) => item.id === post?.board_id);
  const isMutualAidRequest = board?.board_type === "mutual_aid";
  const isSuggestionRequest = board?.board_type === "suggestion";
  const isNotice = board?.board_type === "notice";
  const isResource = board?.board_type === "resource";
  const commentsDisabled = isMutualAidRequest || isSuggestionRequest || isNotice || board?.board_type === "activity_certification" || board?.board_type === "activity_history" || Boolean(board?.slug && NO_COMMENT_RESOURCE_SLUGS.has(board.slug));
  const { data: commentRes } = usePostComments(postId, Boolean(board) && !commentsDisabled);
  const comments = commentRes?.data ?? [];

  const [commentText, setCommentText] = useState("");
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetail, setReportDetail] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isBlockingAuthor, setIsBlockingAuthor] = useState(false);
  const [reportedTargets, setReportedTargets] = useState<Record<string, boolean>>({});
  const [suggestionStatus, setSuggestionStatus] = useState("received");
  const [suggestionReply, setSuggestionReply] = useState("");
  const [mutualAidStatus, setMutualAidStatus] = useState<MutualAidStatus>("processing");
  const [mutualAidRejectionReason, setMutualAidRejectionReason] = useState("");
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const likeMutation = useToggleLike(postId, post?.board_id ?? 0);
  const bookmarkMutation = useToggleBookmark(postId);
  const createCommentMutation = useCreateComment(postId);
  const updateCommentMutation = useUpdateComment(postId);
  const deleteCommentMutation = useDeleteComment(postId);
  const deletePostMutation = useDeletePost(postId, post?.board_id ?? 0);
  const updateSuggestionMutation = useUpdateSuggestion(postId);
  const updateMutualAidMutation = useUpdateMutualAid(postId);

  useEffect(() => {
    if (!post) return;
    setIsLiked(post.is_liked);
    setIsBookmarked(post.is_bookmarked);
    setLikeCount(post.like_count);
    setSuggestionStatus(post.suggestion?.status ?? post.status ?? "received");
    setSuggestionReply(post.suggestion?.admin_reply ?? "");
    setMutualAidStatus(post.mutual_aid?.status ?? "processing");
    setMutualAidRejectionReason(post.mutual_aid?.rejection_reason ?? "");
  }, [post]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [postId]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
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

  const isMine = post.author_id === userId;
  const isAdmin = currentUser?.role === "admin";
  const hasLockedSuggestion = Boolean(post.suggestion?.admin_reply);
  const metadata = post.metadata ?? {};
  const isCouncilActivityEntry = metadata.show_in_council_activity === true;
  const isAdminParticipationGuide = isAdminParticipationGuideBoard(board);
  const applicationButtonLabel = board?.slug === "networking-programs" ? "참가 신청" : "가입 신청";
  const label = isMutualAidRequest
    ? MUTUAL_AID_STATUSES.find((status) => status.value === post.mutual_aid?.status)?.label ?? "처리중"
    : isSuggestionRequest
      ? SUGGESTION_STATUSES.find((status) => status.value === post.suggestion?.status)?.label ?? "대기중"
      : board?.board_type === "activity_certification"
        ? (post.category?.trim() || board?.name || "활동")
      : categoryLabel(post.category, isAdminParticipationGuide ? "모집중" : board?.board_type === "notice" ? "공지" : board?.name ?? "게시글");
  const tone = categoryTone(label);
  const applicationUrl = (typeof metadata.application_url === "string" ? metadata.application_url : undefined) ?? firstUrlFromText(post.content);
  const contentUrl = firstUrlFromText(post.content);
  const canManagePost = (isMine || isAdmin) && !hasLockedSuggestion;
  const canEditOwn = isMine && !hasLockedSuggestion && !isNotice;
  const showReportItem = !isMine;
  const showBlockItem = post.author_id !== null && !isMine && !canManagePost;
  const hasPostMenu = canEditOwn || showReportItem || showBlockItem;
  const currentSuggestionLabel =
    SUGGESTION_STATUSES.find((status) => status.value === (post.suggestion?.status ?? suggestionStatus))?.label ??
    post.suggestion?.status ??
    suggestionStatus;
  const currentMutualAidLabel =
    MUTUAL_AID_STATUSES.find((status) => status.value === post.mutual_aid?.status)?.label ?? "처리중";
  const detailRows: [string, unknown][] =
    board?.board_type === "activity_certification"
      ? [
          ["활동일", metadata.activity_date],
          ["참가자", metadata.participants],
          ...(isAdmin ? ([["계좌번호", metadata.bank_account]] as [string, unknown][]) : []),
        ]
      : board?.board_type === "mutual_aid"
        ? [
            ["경조사 종류", post.mutual_aid?.event_type ?? post.category],
            ["날짜", post.mutual_aid?.event_date ?? metadata.event_date],
            ["관계", post.mutual_aid?.relation ?? metadata.relation],
          ]
        : board?.slug === "study-recruit"
          ? [["스터디장 연락수단", metadata.contact]]
        : [];
  const imageAttachments = post.attachments.filter((attachment) => attachment.content_type.startsWith("image/"));
  const normalizedGalleryIndex = Math.min(galleryIndex, Math.max(imageAttachments.length - 1, 0));
  const isActivityCertification = board?.board_type === "activity_certification";
  const isStudyRecruit = board?.slug === "study-recruit";
  const isStudyActivity = board?.slug === "study-activity";
  const isCouncilActivity = board?.board_type === "activity_history";
  const heroAttachment =
    board?.board_type === "album" || isActivityCertification || isCouncilActivityEntry
      ? imageAttachments[normalizedGalleryIndex]
      : imageAttachments[0];
  const galleryTotal = Math.max(imageAttachments.length, 1);
  const isPhotoAlbum = board?.board_type === "album";
  const hasVisualHero = board?.board_type === "album" || isActivityCertification || isAdminParticipationGuide || isCouncilActivityEntry;
  const visibleAttachments = isPhotoAlbum
    ? []
    : hasVisualHero
      ? post.attachments.filter((attachment) => !attachment.content_type.startsWith("image/"))
      : post.attachments;
  const appBarTitle =
    board?.board_type === "album"
      ? post.title
      : isAdminParticipationGuide
        ? board?.slug === "networking-programs" ? "네트워킹" : "동아리"
        : isCouncilActivityEntry
          ? "원우회 활동내역"
        : isMutualAidRequest
          ? "상조회 신청 상세"
        : board?.board_type === "activity_certification"
          ? "활동 인증"
          : board?.board_type === "notice"
            ? "공지사항"
            : board?.name ?? "게시글";

  const requireLogin = () => {
    if (!userId) {
      router.push("/auth/login");
      return false;
    }
    return true;
  };

  const showPreviousImage = () => {
    if (imageAttachments.length < 2) return;
    setGalleryIndex((current) => (current - 1 + imageAttachments.length) % imageAttachments.length);
  };

  const showNextImage = () => {
    if (imageAttachments.length < 2) return;
    setGalleryIndex((current) => (current + 1) % imageAttachments.length);
  };

  const startReport = (target: ReportTarget) => {
    if (!requireLogin()) return;
    setReportTarget(target);
    setReportReason(REPORT_REASONS[0].value);
    setReportDetail("");
  };

  const submitReport = async () => {
    if (!reportTarget || !requireLogin()) return;
    try {
      setIsReporting(true);
      const payload = {
        reason: reportReason,
        detail: reportReason === "other" ? reportDetail.trim() || undefined : undefined,
      };
      const response =
        reportTarget.type === "post" ? await reportApi.reportPost(reportTarget.id, payload) : await reportApi.reportComment(reportTarget.id, payload);
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

  const handleBlockAuthor = () => {
    const authorId = post.author_id;
    if (!requireLogin() || authorId === null || isMine || isBlockingAuthor) return;
    Alert.alert("작성자 차단", "이 작성자의 게시글과 댓글을 내 화면에서 숨길까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          try {
            setIsBlockingAuthor(true);
            await userApi.blockUser({ blocked_user_id: authorId, reason: "post_detail" });
            Alert.alert("차단 완료", "차단한 작성자의 콘텐츠를 숨겼습니다.");
            router.replace(`/board/${post.board_id}`);
          } catch {
            Alert.alert("차단 실패", "잠시 후 다시 시도하세요.");
          } finally {
            setIsBlockingAuthor(false);
          }
        },
      },
    ]);
  };

  const handleLike = async () => {
    if (!requireLogin() || likeMutation.isPending) return;
    try {
      const response = await likeMutation.mutateAsync();
      setIsLiked(response.data.is_liked);
      setLikeCount(response.data.like_count);
    } catch {
      Alert.alert("좋아요 실패", "좋아요 상태를 변경할 수 없습니다.");
    }
  };

  const handleBookmark = async () => {
    if (!requireLogin() || bookmarkMutation.isPending) return;
    try {
      const response = await bookmarkMutation.mutateAsync();
      setIsBookmarked(response.data.is_bookmarked);
    } catch {
      Alert.alert("북마크 실패", "북마크 상태를 변경할 수 없습니다.");
    }
  };

  const handleParticipationApply = () => {
    if (applicationUrl) {
      Linking.openURL(applicationUrl);
      return;
    }
    Alert.alert(applicationButtonLabel, "관리자가 참여 링크를 준비 중입니다.");
  };

  const handleDeletePost = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeletePost = () => {
    deletePostMutation.mutate(undefined, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        router.replace(`/board/${post.board_id}`);
      },
      onError: () => Alert.alert("삭제 실패", "게시글을 삭제할 수 없습니다."),
    });
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert("댓글 삭제", "이 댓글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          deleteCommentMutation.mutate(commentId, {
            onError: () => Alert.alert("댓글 삭제 실패", "댓글을 삭제할 수 없습니다."),
          }),
      },
    ]);
  };

  const handleCreateComment = () => {
    if (!requireLogin() || createCommentMutation.isPending) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;
    createCommentMutation.mutate(
      { content: trimmed, parent_id: replyParentId },
      {
        onSuccess: () => {
          setCommentText("");
          setReplyParentId(null);
        },
        onError: () => Alert.alert("댓글 등록 실패", "댓글을 저장할 수 없습니다."),
      }
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <IconButton
          icon="chevron-back"
          label="뒤로"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace(`/board/${post.board_id}` as never);
          }}
        />
        <Text numberOfLines={1} style={styles.appBarTitle}>
          {appBarTitle}
        </Text>
        {isPhotoAlbum ? (
          <View style={styles.iconButton} />
        ) : (
          <View style={styles.appBarActions}>
            {!isAdminParticipationGuide && !isActivityCertification && !isStudyRecruit && !isCouncilActivity ? (
              <IconButton
                icon={isBookmarked ? "bookmark" : "bookmark-outline"}
                label="북마크"
                size={20}
                color={isBookmarked ? COLORS.primary : COLORS.text}
                onPress={handleBookmark}
              />
            ) : null}
            {hasPostMenu && !isCouncilActivity ? <IconButton icon="ellipsis-vertical" label="더보기" onPress={() => setShowPostMenu(true)} /> : null}
          </View>
        )}
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={[styles.content, isAdminParticipationGuide || isCouncilActivityEntry || isPhotoAlbum || commentsDisabled ? styles.contentWithoutCommentBar : null]}>
        {hasVisualHero ? (
          <View style={styles.visualHeroBlock}>
            <View style={styles.visualHero}>
              {heroAttachment ? (
                <MediaImage media={heroAttachment} style={styles.visualHeroImage} />
              ) : (
                <LinearGradient
                  colors={board?.board_type === "album" ? ALBUM_FALLBACK_GRADIENTS[normalizedGalleryIndex % ALBUM_FALLBACK_GRADIENTS.length] : ["#2761FF", "#86C8FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.visualHeroFallback}
                />
              )}
              {board?.board_type === "album" || isActivityCertification || isCouncilActivityEntry ? (
                <>
                  {imageAttachments.length > 1 ? (
                    <>
                      <Pressable accessibilityLabel="이전 사진" onPress={showPreviousImage} style={[styles.galleryArrow, styles.galleryArrowLeft]}>
                        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                      </Pressable>
                      <Pressable accessibilityLabel="다음 사진" onPress={showNextImage} style={[styles.galleryArrow, styles.galleryArrowRight]}>
                        <Ionicons name="chevron-forward" size={26} color="#FFFFFF" />
                      </Pressable>
                    </>
                  ) : null}
                  <View style={styles.galleryCount}>
                    <Text style={styles.galleryCountText}>{normalizedGalleryIndex + 1}/{galleryTotal}</Text>
                  </View>
                </>
              ) : null}
            </View>
            {board?.board_type === "album" ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryThumbs}>
                {(imageAttachments.length > 0 ? imageAttachments : [null, null, null, null]).map((attachment, index) => {
                  return (
                    <Pressable
                      key={attachment?.id ?? `fallback-${index}`}
                      accessibilityLabel={`${index + 1}번째 사진`}
                      disabled={!attachment}
                      onPress={() => setGalleryIndex(index)}
                      style={[styles.galleryThumb, index === normalizedGalleryIndex ? styles.galleryThumbActive : null]}
                    >
                      {attachment ? (
                        <MediaImage media={attachment} style={styles.galleryThumbImage} />
                      ) : (
                        <LinearGradient
                          colors={ALBUM_FALLBACK_GRADIENTS[index % ALBUM_FALLBACK_GRADIENTS.length]}
                          style={styles.galleryThumbFallback}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {board?.board_type !== "album" ? (
          <>
            {isActivityCertification && isStudyActivity ? (
              <Text style={styles.activityStudyTitle}>{label}</Text>
            ) : isCouncilActivity ? null : (
              <View style={[styles.categoryPill, { backgroundColor: tone.bg }]}>
                <Text style={[styles.categoryText, { color: tone.fg }]}>{label}</Text>
              </View>
            )}

            {!isActivityCertification ? (
              <Text style={[styles.title, board?.board_type === "notice" ? styles.titleNotice : (isAdminParticipationGuide || isStudyRecruit || isCouncilActivity) ? styles.titleGuide : null]}>{post.title}</Text>
            ) : null}
            {!isAdminParticipationGuide && !isActivityCertification && !isCouncilActivity ? (
              <Text style={[styles.meta, board?.board_type === "notice" ? styles.metaNotice : null]}>
                {board?.board_type === "notice"
                  ? `${shortDate(post.created_at)} · 조회 ${post.view_count}`
                  : isMutualAidRequest
                    ? `${formatCohortName(post.author_cohort, post.author_nickname)} · ${shortDate(post.created_at)}`
                  : commentsDisabled
                    ? shortDate(post.created_at)
                  : isResource || isStudyRecruit
                    ? `${formatCohortName(post.author_cohort, post.author_nickname)} · ${shortDate(post.created_at)}`
                  : `${post.author_nickname} · ${shortDate(post.created_at)}`}
              </Text>
            ) : null}

            {!isAdminParticipationGuide && !isActivityCertification ? <View style={styles.bodyDivider} /> : null}
          </>
        ) : null}
        {!isPhotoAlbum && post.content.trim() ? <Text style={[styles.body, isAdminParticipationGuide || isActivityCertification ? styles.bodyTopGap : null]}>{post.content}</Text> : null}

        {board?.board_type === "notice" && contentUrl ? (
          <Pressable onPress={() => Linking.openURL(contentUrl)} style={styles.externalLinkButton}>
            <Ionicons name="link-outline" size={18} color={COLORS.primary} />
            <Text numberOfLines={1} style={styles.externalLinkText}>{contentUrl}</Text>
            <Ionicons name="open-outline" size={17} color={COLORS.primary} />
          </Pressable>
        ) : null}

        {isActivityCertification ? (
          <>
            {typeof metadata.activity_date === "string" && metadata.activity_date.trim() ? (
              <View style={styles.certDateRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
                <Text style={styles.certDateText}>{formatDotDate(metadata.activity_date)}</Text>
              </View>
            ) : null}
            {typeof metadata.participants === "string" && metadata.participants.trim() ? (
              <>
                <Text style={styles.certParticipantLabel}>참가자</Text>
                <View style={styles.certParticipantList}>
                  {metadata.participants
                    .split(",")
                    .map((name) => name.trim())
                    .filter(Boolean)
                    .map((name, index) => (
                      <View key={`${name}-${index}`} style={styles.certParticipantChip}>
                        <Text style={styles.certParticipantChipText}>{name}</Text>
                      </View>
                    ))}
                </View>
              </>
            ) : null}
          </>
        ) : isStudyRecruit ? (
          typeof metadata.contact === "string" && metadata.contact.trim() ? (
            <View style={styles.certDateRow}>
              <Ionicons name="call-outline" size={15} color={COLORS.muted} />
              <Text style={styles.certDateText}>스터디장 연락수단 {metadata.contact}</Text>
            </View>
          ) : null
        ) : detailRows.length > 0 ? (
          <View style={styles.infoBox}>
            {detailRows
              .filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim().length > 0)
              .map(([rowLabel, value]) => (
                <View key={rowLabel} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{rowLabel}</Text>
                  <Text style={styles.infoValue}>{value}</Text>
                </View>
              ))}
          </View>
        ) : null}

        {visibleAttachments.length > 0 ? (
          <View style={styles.attachments}>
            {visibleAttachments.map((attachment) => {
              const isImage = attachment.content_type.startsWith("image/");
              return (
                <Pressable
                  key={attachment.id}
                  onPress={async () => {
                    try {
                      const accessUrl = await resolveMediaAccessUrl(attachment);
                      if (accessUrl) await Linking.openURL(accessUrl);
                    } catch {
                      Alert.alert("파일 열기 실패", "첨부 파일에 접근할 수 없습니다.");
                    }
                  }}
                  style={isImage ? styles.imageAttachment : styles.fileAttachment}
                >
                  {isImage ? <MediaImage media={attachment} style={styles.attachmentImage} /> : null}
                  {!isImage ? (
                    <>
                      <Ionicons name="document-outline" size={18} color={COLORS.subtle} />
                      <Text numberOfLines={1} style={styles.fileName}>
                        {attachment.original_filename}
                      </Text>
                      <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {isAdminParticipationGuide ? (
          <Pressable onPress={handleParticipationApply} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>{applicationButtonLabel}</Text>
          </Pressable>
        ) : null}

        {post.suggestion?.admin_reply ? (
          <View style={styles.officialReplyBox}>
            <Text style={styles.officialReplyTitle}>💬 원우회 답변</Text>
            <Text style={styles.officialReplyBody}>{post.suggestion.admin_reply}</Text>
            {post.suggestion.replied_at ? <Text style={styles.officialReplyDate}>{shortDate(post.suggestion.replied_at)}</Text> : null}
          </View>
        ) : null}

        {post.suggestion && isAdmin ? (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionTitle}>관리자 답변 관리</Text>
            <Text style={styles.suggestionStatus}>{currentSuggestionLabel}</Text>
            <View style={styles.adminReplyBox}>
                <View style={styles.statusRow}>
                  {SUGGESTION_STATUSES.map((status) => (
                    <Pressable
                      key={status.value}
                      onPress={() => setSuggestionStatus(status.value)}
                      style={[styles.statusChip, suggestionStatus === status.value ? styles.statusChipActive : null]}
                    >
                      <Text style={[styles.statusChipText, suggestionStatus === status.value ? styles.statusChipTextActive : null]}>{status.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  multiline
                  value={suggestionReply}
                  onChangeText={setSuggestionReply}
                  placeholder="공식 답변"
                  placeholderTextColor={COLORS.subtle}
                  style={styles.replyTextarea}
                />
                <Pressable
                  disabled={updateSuggestionMutation.isPending}
                  onPress={() => {
                    if (suggestionStatus === "answered" && !suggestionReply.trim()) {
                      Alert.alert("답변 내용 필요", "답변완료 처리하려면 공식 답변을 입력해주세요.");
                      return;
                    }
                    updateSuggestionMutation.mutate(
                      { status: suggestionStatus, admin_reply: suggestionReply.trim() || undefined },
                      { onSuccess: () => Alert.alert("답변 저장", "건의사항 답변이 저장되었습니다.") }
                    );
                  }}
                  style={styles.replySaveButton}
                >
                  <Text style={styles.replySaveText}>{updateSuggestionMutation.isPending ? "저장 중" : "답변 저장"}</Text>
                </Pressable>
            </View>
          </View>
        ) : null}

        {post.mutual_aid ? (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionTitle}>상조회 처리 상태</Text>
            <Text style={styles.suggestionStatus}>{currentMutualAidLabel}</Text>
            {post.mutual_aid.rejection_reason ? (
              <Text style={styles.suggestionBody}>반려 사유: {post.mutual_aid.rejection_reason}</Text>
            ) : null}
            {isAdmin ? (
              <View style={styles.adminReplyBox}>
                <View style={styles.statusRow}>
                  {MUTUAL_AID_STATUSES.map((status) => (
                    <Pressable
                      key={status.value}
                      onPress={() => setMutualAidStatus(status.value)}
                      style={[styles.statusChip, mutualAidStatus === status.value ? styles.statusChipActive : null]}
                    >
                      <Text style={[styles.statusChipText, mutualAidStatus === status.value ? styles.statusChipTextActive : null]}>
                        {status.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {mutualAidStatus === "rejected" ? (
                  <TextInput
                    multiline
                    value={mutualAidRejectionReason}
                    onChangeText={setMutualAidRejectionReason}
                    placeholder="반려 사유를 입력하세요"
                    placeholderTextColor={COLORS.subtle}
                    style={styles.replyTextarea}
                  />
                ) : null}
                <Pressable
                  disabled={updateMutualAidMutation.isPending}
                  onPress={() => {
                    if (mutualAidStatus === "rejected" && !mutualAidRejectionReason.trim()) {
                      Alert.alert("반려 사유 필요", "반려 사유를 입력해주세요.");
                      return;
                    }
                    updateMutualAidMutation.mutate(
                      {
                        status: mutualAidStatus,
                        rejection_reason: mutualAidStatus === "rejected" ? mutualAidRejectionReason.trim() : undefined,
                      },
                      { onSuccess: () => Alert.alert("상태 저장", "상조회 처리 상태가 저장되었습니다.") }
                    );
                  }}
                  style={styles.replySaveButton}
                >
                  <Text style={styles.replySaveText}>{updateMutualAidMutation.isPending ? "저장 중" : "상태 저장"}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {!isAdminParticipationGuide && !isCouncilActivityEntry && !isPhotoAlbum && !isMutualAidRequest && !isSuggestionRequest && !isNotice && !isActivityCertification && !isStudyRecruit && !isCouncilActivity ? (
          <View style={styles.actionRow}>
            <Pressable disabled={likeMutation.isPending} onPress={handleLike} style={styles.iconAction}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={16} color={isLiked ? COLORS.primary : COLORS.muted} />
              <Text style={styles.actionText}>추천 {likeCount}</Text>
            </Pressable>
            {!commentsDisabled ? (
              <View style={styles.iconAction}>
                <Ionicons name="chatbubble-outline" size={16} color={COLORS.muted} />
                <Text style={styles.actionText}>댓글 {post.comment_count}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {!isAdminParticipationGuide && !isCouncilActivityEntry && !isPhotoAlbum && !commentsDisabled ? (
          <View style={styles.commentSection}>
            <Text style={styles.commentTitle}>댓글 {post.comment_count}</Text>
            {comments.length === 0 ? <Text style={styles.emptyComment}>아직 댓글이 없어요. 첫 댓글을 남겨보세요!</Text> : null}
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={userId}
                onDelete={handleDeleteComment}
                onEdit={(commentId, content) =>
                  updateCommentMutation.mutate(
                    { commentId, content },
                    { onError: () => Alert.alert("댓글 수정 실패", "댓글을 수정할 수 없습니다.") }
                  )
                }
                onReport={startReport}
                reportedTargets={reportedTargets}
                onReply={(commentId) => setReplyParentId(commentId)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      {!isAdminParticipationGuide && !isCouncilActivityEntry && !isPhotoAlbum && !commentsDisabled ? (
        <View style={[styles.commentBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {replyParentId ? (
            <View style={styles.replyNotice}>
              <Text style={styles.replyNoticeText}>#{replyParentId} 답글 작성 중</Text>
              <Pressable onPress={() => setReplyParentId(null)}>
                <Text style={styles.replyCancelText}>취소</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.commentInputRow}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="댓글을 남겨보세요"
              placeholderTextColor="#A6ACB7"
              style={[styles.commentInput, { outlineStyle: "none" } as never]}
            />
            <Pressable disabled={createCommentMutation.isPending} onPress={handleCreateComment} style={styles.sendButton}>
              <Ionicons name="send" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {showPostMenu ? (
        <Pressable accessibilityLabel="더보기 메뉴 닫기" onPress={() => setShowPostMenu(false)} style={styles.menuOverlay}>
          <Pressable onPress={(event) => event.stopPropagation()} style={[styles.menuCard, { marginTop: Math.max(insets.top, 10) + 44 }]}>
            {canEditOwn ? (
              <>
                <Pressable
                  onPress={() => {
                    setShowPostMenu(false);
                    router.push(`/board/post/edit/${post.id}`);
                  }}
                  style={styles.menuItem}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.text} />
                  <Text style={styles.menuItemText}>수정</Text>
                </Pressable>
                <View style={styles.menuDivider} />
                <Pressable
                  onPress={() => {
                    setShowPostMenu(false);
                    handleDeletePost();
                  }}
                  style={styles.menuItem}
                >
                  <Ionicons name="trash-outline" size={20} color="#D64545" />
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>삭제</Text>
                </Pressable>
              </>
            ) : null}
            {showReportItem ? (
              <>
                {canEditOwn ? <View style={styles.menuDivider} /> : null}
                <Pressable
                  disabled={reportedTargets[`post:${post.id}`]}
                  onPress={() => {
                    setShowPostMenu(false);
                    startReport({ type: "post", id: post.id, label: "게시글" });
                  }}
                  style={styles.menuItem}
                >
                  <Ionicons name="flag-outline" size={20} color={COLORS.text} />
                  <Text style={styles.menuItemText}>{reportedTargets[`post:${post.id}`] ? "신고됨" : "신고"}</Text>
                </Pressable>
              </>
            ) : null}
            {showBlockItem ? (
              <>
                {canEditOwn || showReportItem ? <View style={styles.menuDivider} /> : null}
                <Pressable
                  disabled={isBlockingAuthor}
                  onPress={() => {
                    setShowPostMenu(false);
                    handleBlockAuthor();
                  }}
                  style={styles.menuItem}
                >
                  <Ionicons name="remove-circle-outline" size={20} color={COLORS.text} />
                  <Text style={styles.menuItemText}>{isBlockingAuthor ? "차단 중" : "작성자 차단"}</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      ) : null}

      {reportTarget ? (
        <Pressable accessibilityLabel="신고하기 닫기" onPress={() => setReportTarget(null)} style={styles.modalBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.reportSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.reportSheetTitle}>신고하기</Text>
            <Text style={styles.reportSheetSubtitle}>신고 사유를 선택해주세요</Text>
            <View style={styles.reportReasonList}>
              {REPORT_REASONS.map((reason) => {
                const selected = reportReason === reason.value;
                return (
                  <Pressable key={reason.value} onPress={() => setReportReason(reason.value)} style={styles.reportReasonItem}>
                    <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={[styles.reportReasonText, selected ? styles.reportReasonTextSelected : null]}>{reason.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {reportReason === "other" ? (
              <TextInput
                multiline
                value={reportDetail}
                onChangeText={setReportDetail}
                placeholder="구체적인 사유를 입력해주세요"
                placeholderTextColor={COLORS.subtle}
                style={styles.reportDetailInput}
                textAlignVertical="top"
              />
            ) : null}
            <Pressable disabled={isReporting} onPress={submitReport} style={[styles.reportPrimaryButton, isReporting ? styles.buttonDisabled : null]}>
              <Text style={styles.reportPrimaryButtonText}>{isReporting ? "제출 중" : "제출"}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      ) : null}

      {showDeleteConfirm ? (
        <Pressable accessibilityLabel="게시물 삭제 닫기" onPress={() => setShowDeleteConfirm(false)} style={styles.confirmBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>게시물 삭제</Text>
            <Text style={styles.confirmBody}>삭제한 게시물은 복구할 수 없어요.{"\n"}작성한 댓글도 함께 삭제돼요.</Text>
            <View style={styles.confirmActions}>
              <Pressable disabled={deletePostMutation.isPending} onPress={() => setShowDeleteConfirm(false)} style={styles.confirmCancelButton}>
                <Text style={styles.confirmCancelText}>취소</Text>
              </Pressable>
              <Pressable disabled={deletePostMutation.isPending} onPress={confirmDeletePost} style={[styles.confirmDeleteButton, deletePostMutation.isPending ? styles.buttonDisabled : null]}>
                <Text style={styles.confirmDeleteText}>{deletePostMutation.isPending ? "삭제 중" : "삭제"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.page,
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
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },
  appBarTitle: {
    position: "absolute",
    left: 88,
    right: 88,
    textAlign: "center",
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "500",
  },
  appBarActions: {
    flexDirection: "row",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17, 24, 39, 0.38)",
    zIndex: 50,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    backgroundColor: "rgba(17, 24, 39, 0.15)",
    zIndex: 50,
  },
  menuCard: {
    minWidth: 190,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  menuItem: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
  },
  menuItemDanger: {
    color: "#D64545",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#EAECEF",
  },
  menuSheet: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: "#E1E4E9",
    marginBottom: 8,
  },
  sheetMenuItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sheetMenuText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  sheetMenuDangerText: {
    color: "#EF4444",
  },
  reportSheet: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  reportSheetTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 6,
  },
  reportSheetSubtitle: {
    color: "#6B727D",
    fontSize: 13,
    fontWeight: "400",
    marginTop: 4,
    marginBottom: 12,
  },
  reportReasonList: {
    marginTop: 4,
  },
  reportReasonItem: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EAECEF",
  },
  radioOuter: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBD1DA",
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  reportReasonText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
  },
  reportReasonTextSelected: {
    fontWeight: "500",
  },
  reportDetailInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 13,
    padding: 12,
    marginTop: 12,
  },
  reportPrimaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    marginTop: 16,
  },
  reportPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.38)",
    paddingHorizontal: 28,
    zIndex: 60,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  confirmTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
    textAlign: "center",
  },
  confirmBody: {
    color: "#4B5160",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 16,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  confirmCancelButton: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E4E9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  confirmCancelText: {
    color: "#4B5160",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmDeleteButton: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#D64545",
    paddingHorizontal: 14,
  },
  confirmDeleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  postMenu: {
    position: "absolute",
    right: 18,
    zIndex: 20,
    minWidth: 152,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    paddingVertical: 5,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  postMenuItem: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
  },
  postMenuText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  scroller: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 116,
  },
  contentWithoutCommentBar: {
    paddingBottom: 44,
  },
  categoryPill: {
    alignSelf: "flex-start",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "400",
  },
  visualHeroBlock: {
    marginHorizontal: -20,
    marginTop: -8,
    marginBottom: 18,
  },
  visualHero: {
    position: "relative",
    height: 230,
    overflow: "hidden",
    backgroundColor: "#EEF2F7",
  },
  visualHeroImage: {
    width: "100%",
    height: "100%",
  },
  visualHeroFallback: {
    flex: 1,
  },
  galleryArrow: {
    position: "absolute",
    top: "42%",
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(17,24,39,0.16)",
    zIndex: 2,
  },
  galleryArrowLeft: {
    left: 8,
  },
  galleryArrowRight: {
    right: 8,
  },
  galleryCount: {
    position: "absolute",
    right: 14,
    bottom: 14,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.48)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  galleryCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  galleryThumbs: {
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  galleryThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  galleryThumbActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  galleryThumbImage: {
    width: "100%",
    height: "100%",
  },
  galleryThumbFallback: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "400",
    lineHeight: 27,
    marginTop: 12,
  },
  titleNotice: {
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 28,
  },
  titleGuide: {
    fontWeight: "500",
  },
  meta: {
    color: "#A6ACB7",
    fontSize: 12,
    fontWeight: "400",
    marginTop: 8,
  },
  metaNotice: {
    color: COLORS.muted,
    fontSize: 13,
  },
  bodyDivider: {
    height: 1,
    backgroundColor: "#E1E4E9",
    marginTop: 16,
    marginBottom: 16,
  },
  body: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 23,
  },
  bodyTopGap: {
    marginTop: 16,
  },
  activityStudyTitle: {
    width: "100%",
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 24,
  },
  certDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E1E4E9",
    paddingBottom: 16,
    marginTop: 16,
  },
  certDateText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
  },
  certParticipantLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 10,
  },
  certParticipantList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  certParticipantChip: {
    borderWidth: 0.5,
    borderColor: "#E1E4E9",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  certParticipantChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
  },
  externalLinkButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 13,
    marginTop: 14,
  },
  externalLinkText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  galleryCaption: {
    marginTop: 4,
  },
  joinButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 20,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  infoBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
    marginTop: 22,
  },
  infoRow: {
    paddingVertical: 12,
  },
  infoLabel: {
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: "900",
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },
  attachments: {
    gap: 10,
    marginTop: 24,
  },
  fileAttachment: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 0.5,
    borderColor: "#E1E4E9",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  imageAttachment: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  attachmentImage: {
    width: "100%",
    height: 220,
  },
  fileName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
  },
  suggestionBox: {
    borderRadius: 8,
    backgroundColor: COLORS.cyan50,
    padding: 14,
    marginTop: 24,
  },
  suggestionTitle: {
    color: COLORS.cyan700,
    fontSize: 15,
    fontWeight: "900",
  },
  officialReplyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  officialReplyBox: {
    borderRadius: 12,
    backgroundColor: "#F7F8FA", // Figma 236:39
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  officialReplyTitle: {
    color: "#2761FF",
    fontSize: 13,
    fontWeight: "500", // Figma: Medium
  },
  officialReplyBody: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "400", // Figma: Regular
    lineHeight: 23,
  },
  officialReplyDate: {
    color: "#A6ACB7",
    fontSize: 12,
    fontWeight: "400",
  },
  suggestionStatus: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 7,
  },
  suggestionBody: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 9,
  },
  adminReplyBox: {
    gap: 10,
    marginTop: 12,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusChip: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipActive: {
    backgroundColor: COLORS.cyan700,
  },
  statusChipText: {
    color: COLORS.cyan700,
    fontWeight: "900",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  replyTextarea: {
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    color: COLORS.text,
    padding: 12,
    textAlignVertical: "top",
  },
  replySaveButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: COLORS.cyan700,
    paddingVertical: 11,
  },
  replySaveText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    borderBottomWidth: 0.5,
    borderColor: "#E1E4E9",
    paddingBottom: 16,
    marginTop: 20,
  },
  iconAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
  },
  ownerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  ownerButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingVertical: 11,
  },
  ownerButtonText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  deleteButton: {
    borderColor: "#FECACA",
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontWeight: "900",
  },
  reportBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: COLORS.danger50,
    padding: 14,
    marginTop: 18,
  },
  reportTitle: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "900",
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  reasonChip: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  reasonChipActive: {
    backgroundColor: COLORS.danger,
  },
  reasonText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "900",
  },
  reasonTextActive: {
    color: "#FFFFFF",
  },
  reportInput: {
    minHeight: 76,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    color: COLORS.text,
    padding: 12,
    marginTop: 10,
    textAlignVertical: "top",
  },
  reportActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  reportSubmit: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    paddingVertical: 11,
  },
  reportSubmitText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  reportCancel: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 11,
  },
  reportCancelText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  commentSection: {
    marginTop: 16,
  },
  commentTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyComment: {
    color: "#A6ACB7",
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
    paddingVertical: 24,
  },
  commentBar: {
    borderTopWidth: 0.5,
    borderTopColor: "#E1E4E9",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  replyNotice: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  replyNoticeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  replyCancelText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  commentInput: {
    flex: 1,
    height: 38,
    borderWidth: 0.5,
    borderColor: "#E1E4E9",
    borderRadius: 999,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "400",
    paddingHorizontal: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: COLORS.primary,
  },
});
