import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PostListItem } from "../types";
import { formatCohortName } from "../utils/userLabel";

type Props = {
  post: PostListItem;
  onPress: (postId: number) => void;
  boardType?: string;
  boardSlug?: string;
};

const COLORS = {
  primary: "#2761FF",
  primary50: "#EDF2FE",
  text: "#15171C",
  muted: "#6B7280",
  subtle: "#8A919C",
  divider: "#EEF0F3",
  pink50: "#FFEAF1",
  pink700: "#B91C4C",
  yellow50: "#FFF6DC",
  yellow700: "#9A6B00",
  green50: "#EAF8EF",
  green700: "#1F7A46",
  purple50: "#F1EEFB",
  purple700: "#5B49C8",
};

const TYPE_LABELS: Record<string, string> = {
  album: "사진첩",
  external_link: "외부 링크",
  faq: "FAQ",
  organization_intro: "소개",
  suggestion: "건의",
  notice: "공지",
  calendar: "일정",
  guide: "가이드",
  resource: "자료",
  activity_certification: "활동 인증",
  activity_history: "활동 내역",
  mutual_aid: "상조회",
};

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(2, 10).replace(/-/g, ".");
  }
  return `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeCategory(post: PostListItem, boardType?: string) {
  if (boardType === "suggestion" && post.suggestion) {
    return post.suggestion.status === "answered" ? "답변완료" : "대기중";
  }
  if (boardType === "mutual_aid" && post.mutual_aid) {
    return {
      processing: "처리중",
      completed: "처리 완료",
      rejected: "반려",
    }[post.mutual_aid.status];
  }
  const raw = post.category?.trim();
  if (raw) {
    const lower = raw.toLowerCase();
    if (lower.includes("event") || raw.includes("행사")) return "행사공지";
    if (lower.includes("academic") || raw.includes("학사")) return "학사공지";
    if (raw.includes("전체")) return "공지";
    return raw.length <= 8 ? raw : "공지";
  }
  return boardType ? (TYPE_LABELS[boardType] ?? boardType) : "게시글";
}

function categoryTone(label: string) {
  if (label.includes("반려")) return { bg: "#FBEAF0", fg: "#993556" };
  if (label.includes("완료")) return { bg: "#EAF8EF", fg: "#1F7A46" };
  if (label.includes("대기")) return { bg: "#FFF6DC", fg: "#9A6B00" };
  if (label.includes("종합")) return { bg: "#FAEEDA", fg: "#854F0B" };
  if (label.includes("행사") || label.includes("시험")) return { bg: "#FBEAF0", fg: "#993556" };
  if (label.includes("졸업") || label.includes("인증")) return { bg: "#EAF3DE", fg: "#3B6D11" };
  if (label.includes("강의") || label.includes("후기") || label.includes("스터디") || label.includes("모집")) return { bg: "#EEEDFE", fg: "#3C3489" };
  return { bg: "#E6F1FB", fg: "#0C447C" };
}

function compactPreview(post: PostListItem) {
  const title = post.title.trim();
  const preview = post.content_preview.trim();
  const withoutDuplicateTitle = preview.startsWith(title) ? preview.slice(title.length).trim() : preview;
  const firstMeaningfulLine = withoutDuplicateTitle
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && line !== title);
  return firstMeaningfulLine ?? "";
}

export default function PostCard({ post, onPress, boardType, boardSlug }: Props) {
  const label = normalizeCategory(post, boardType);
  const tone = categoryTone(label);
  const preview = compactPreview(post);
  const isAnonymousNoCommentBoard = boardSlug === "lecture-reviews";
  const isMutualAid = boardType === "mutual_aid";
  const isSuggestion = boardType === "suggestion";
  const isWorkflowRequest = isMutualAid || isSuggestion;

  return (
    <Pressable onPress={() => onPress(post.id)} style={styles.row}>
      <View style={styles.metaRow}>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.fg }]}>{label}</Text>
        </View>
        {post.is_pinned || post.is_notice ? (
          <View style={styles.pinPill}>
            <Ionicons name="bookmark" size={11} color={COLORS.primary} />
            <Text style={styles.pinText}>고정</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      {preview && !isWorkflowRequest ? (
        <Text style={styles.preview} numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
      <Text style={styles.footerText} numberOfLines={1}>
        {[
          !isAnonymousNoCommentBoard && !isSuggestion
            ? isMutualAid
              ? formatCohortName(post.author_cohort, post.author_nickname)
              : post.author_nickname
            : null,
          shortDate(post.created_at),
          !isAnonymousNoCommentBoard && !isWorkflowRequest ? `댓글 ${post.comment_count}` : null,
          !isWorkflowRequest ? `추천 ${post.like_count}` : null,
          !isWorkflowRequest && post.attachment_count ? `첨부 ${post.attachment_count}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#E1E4E9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pill: {
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "400",
  },
  pinPill: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 7,
  },
  pinText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 6,
  },
  preview: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
    marginTop: 6,
  },
  footerText: {
    color: "#A6ACB7",
    fontSize: 12,
    fontWeight: "400",
    marginTop: 6,
  },
});
