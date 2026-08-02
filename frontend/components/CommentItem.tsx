import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { CommentNode } from "../types";
import { formatBoardDate, formatRelativeTime } from "../utils/dateFormat";
import { formatCohortName } from "../utils/userLabel";

type CommentReportTarget = {
  type: "comment";
  id: number;
  label: string;
};

type Props = {
  comment: CommentNode;
  depth?: number;
  currentUserId?: number | null;
  onReply?: (commentId: number) => void;
  onEdit?: (commentId: number, content: string) => void;
  onDelete?: (commentId: number) => void;
  onReport?: (target: CommentReportTarget) => void;
  reportedTargets?: Record<string, boolean>;
};

function formatCommentDate(value: string) {
  return [formatBoardDate(value), formatRelativeTime(value)].filter(Boolean).join(" · ");
}

export default function CommentItem({
  comment,
  depth = 0,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReport,
  reportedTargets = {},
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const isMine = currentUserId === comment.author_id;
  const isReported = reportedTargets[`comment:${comment.id}`];
  const canReport = !isMine && Boolean(onReport) && !isReported;
  const canReply = depth === 0 && Boolean(onReply);
  const hasActionRow = isMine || canReply;

  return (
    <View
      style={{
        marginLeft: depth * 14,
        paddingVertical: 12,
        paddingHorizontal: depth > 0 ? 12 : 0,
        borderRadius: depth > 0 ? 8 : 0,
        backgroundColor: depth > 0 ? "#F8FAFC" : undefined,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 27 }}>
        <Text style={{ color: "#15171C", fontSize: 13, fontWeight: "500" }}>
          {formatCohortName(comment.author_cohort, comment.author_nickname)}
        </Text>
        {isReported ? (
          <Text style={{ color: "#15803D", fontSize: 11, fontWeight: "400" }}>신고됨</Text>
        ) : canReport ? (
          <Pressable onPress={() => onReport?.({ type: "comment", id: comment.id, label: `댓글 #${comment.id}` })}>
            <Text style={{ color: "#A6ACB7", fontSize: 11, fontWeight: "400" }}>신고</Text>
          </Pressable>
        ) : null}
      </View>

      {isEditing ? (
        <TextInput
          multiline
          onChangeText={setDraft}
          style={{ marginTop: 8, minHeight: 72, borderWidth: 1, borderColor: "#E1E4E9", borderRadius: 8, padding: 10 }}
          value={draft}
        />
      ) : (
        <Text style={{ marginTop: 4, color: "#6B7280", fontSize: 13, lineHeight: 20 }}>{comment.content}</Text>
      )}

      <Text style={{ marginTop: 4, color: "#A6ACB7", fontSize: 11 }}>{formatCommentDate(comment.created_at)}</Text>

      {hasActionRow ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
          {canReply ? (
            <Pressable onPress={() => onReply?.(comment.id)}>
              <Text style={{ color: "#2761FF", fontSize: 12, fontWeight: "500" }}>답글</Text>
            </Pressable>
          ) : null}

          {isMine && isEditing ? (
            <>
              <Pressable
                onPress={() => {
                  const next = draft.trim();
                  if (next) {
                    onEdit?.(comment.id, next);
                    setIsEditing(false);
                  }
                }}
              >
                <Text style={{ color: "#0F766E", fontSize: 12, fontWeight: "500" }}>저장</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDraft(comment.content);
                  setIsEditing(false);
                }}
              >
                <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "500" }}>취소</Text>
              </Pressable>
            </>
          ) : null}

          {isMine && !isEditing ? (
            <>
              <Pressable onPress={() => setIsEditing(true)}>
                <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "500" }}>수정</Text>
              </Pressable>
              <Pressable onPress={() => onDelete?.(comment.id)}>
                <Text style={{ color: "#B91C1C", fontSize: 12, fontWeight: "500" }}>삭제</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {comment.children.map((child) => (
        <CommentItem
          key={child.id}
          comment={child}
          currentUserId={currentUserId}
          depth={depth + 1}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={onReply}
          onReport={onReport}
          reportedTargets={reportedTargets}
        />
      ))}
    </View>
  );
}
