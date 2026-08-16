import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { CommentNode } from "../types";
import { commentEditSubmissionValue, getCommentActionState } from "../utils/commentPresentation";
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
  onReply?: (comment: CommentNode) => void;
  onEdit?: (commentId: number, content: string) => Promise<void> | void;
  onDelete?: (commentId: number) => void;
  onReport?: (target: CommentReportTarget) => void;
  onOwnReport?: () => void;
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
  onOwnReport,
  reportedTargets = {},
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const isMine = currentUserId === comment.author_id;
  const isReported = reportedTargets[`comment:${comment.id}`];
  const actionState = getCommentActionState({
    depth,
    isMine,
    isEditing,
    isReported: Boolean(isReported),
  });
  const hasActionRow = (actionState.showReply && Boolean(onReply))
    || actionState.showEdit
    || actionState.showDelete
    || actionState.showSave
    || actionState.showCancel;

  const saveEdit = async () => {
    const next = commentEditSubmissionValue(draft, isSaving);
    if (!next || !onEdit) return;
    try {
      setIsSaving(true);
      await onEdit(comment.id, next);
      setIsEditing(false);
    } catch {
      // The route owns user-facing error feedback; keep the draft open for retry.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View
      style={{
        marginLeft: depth * 14,
        marginTop: depth > 0 ? 8 : 0,
        paddingTop: 12,
        paddingBottom: depth === 0 ? 16 : 12,
        paddingHorizontal: depth > 0 ? 12 : 0,
        borderBottomWidth: depth === 0 ? 1 : 0,
        borderBottomColor: "#EAECEF",
        borderRadius: depth > 0 ? 8 : 0,
        backgroundColor: depth > 0 ? "#F7F7F8" : undefined,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 27 }}>
        <Text style={{ color: "#15171C", fontSize: 13, fontWeight: "500" }}>
          {formatCohortName(comment.author_cohort, comment.author_nickname)}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={actionState.reportAction === "none"}
          onPress={() => {
            if (actionState.reportAction === "own-unavailable") {
              onOwnReport?.();
              return;
            }
            if (actionState.reportAction === "open") {
              onReport?.({ type: "comment", id: comment.id, label: `댓글 #${comment.id}` });
            }
          }}
        >
          <Text
            style={{
              color: actionState.reportAction === "none" ? "#15803D" : "#A6ACB7",
              fontSize: 11,
              fontWeight: "400",
            }}
          >
            {actionState.reportLabel}
          </Text>
        </Pressable>
      </View>

      {isEditing ? (
        <TextInput
          autoFocus
          maxLength={500}
          multiline
          onChangeText={setDraft}
          style={[
            {
              marginTop: 8,
              minHeight: 52,
              borderWidth: 1.5,
              borderColor: "#2761FF",
              borderRadius: 8,
              color: "#15171C",
              fontSize: 13,
              lineHeight: 20,
              paddingHorizontal: 10,
              paddingVertical: 9,
              textAlignVertical: "top",
            },
            { outlineStyle: "none" } as never,
          ]}
          value={draft}
        />
      ) : (
        <Text style={{ marginTop: 4, color: "#6B7280", fontSize: 13, lineHeight: 20 }}>{comment.content}</Text>
      )}

      <Text style={{ marginTop: 4, color: "#A6ACB7", fontSize: 11 }}>{formatCommentDate(comment.created_at)}</Text>

      {hasActionRow ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
          {actionState.showReply && onReply ? (
            <Pressable onPress={() => onReply(comment)}>
              <Text style={{ color: "#2761FF", fontSize: 12, fontWeight: "500" }}>답글</Text>
            </Pressable>
          ) : null}

          {actionState.showSave ? (
            <Pressable disabled={isSaving} onPress={saveEdit}>
              <Text style={{ color: "#2761FF", fontSize: 12, fontWeight: "500" }}>
                {isSaving ? "저장 중" : "저장"}
              </Text>
            </Pressable>
          ) : null}

          {actionState.showCancel ? (
            <Pressable
              disabled={isSaving}
              onPress={() => {
                setDraft(comment.content);
                setIsEditing(false);
              }}
            >
              <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "500" }}>취소</Text>
            </Pressable>
          ) : null}

          {actionState.showEdit ? (
            <Pressable
              onPress={() => {
                setDraft(comment.content);
                setIsEditing(true);
              }}
            >
              <Text style={{ color: "#2761FF", fontSize: 12, fontWeight: "500" }}>수정</Text>
            </Pressable>
          ) : null}

          {actionState.showDelete ? (
            <Pressable onPress={() => onDelete?.(comment.id)}>
              <Text style={{ color: "#D64545", fontSize: 12, fontWeight: "500" }}>삭제</Text>
            </Pressable>
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
          onOwnReport={onOwnReport}
          reportedTargets={reportedTargets}
        />
      ))}
    </View>
  );
}
