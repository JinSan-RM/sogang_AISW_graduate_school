import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { CommentNode } from "../types";

type Props = {
  comment: CommentNode;
  depth?: number;
  currentUserId?: number | null;
  onReply?: (commentId: number) => void;
  onEdit?: (commentId: number, content: string) => void;
  onDelete?: (commentId: number) => void;
  onReport?: (target: { type: "comment"; id: number; label: string }) => void;
  reportedTargets?: Record<string, boolean>;
};

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

  return (
    <View
      style={{
        marginLeft: depth * 14,
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        backgroundColor: depth > 0 ? "#f8fafc" : "#ffffff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <Text style={{ color: "#475569", fontSize: 12, fontWeight: "700" }}>{comment.author_nickname}</Text>
      {isEditing ? (
        <TextInput
          multiline
          onChangeText={setDraft}
          style={{ marginTop: 8, minHeight: 72, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 10 }}
          value={draft}
        />
      ) : (
        <Text style={{ marginTop: 6, color: "#111827", lineHeight: 20 }}>{comment.content}</Text>
      )}
      <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
        {depth === 0 && onReply ? (
          <Pressable onPress={() => onReply(comment.id)}>
            <Text style={{ color: "#2563eb", fontWeight: "700" }}>답글</Text>
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
              <Text style={{ color: "#0f766e", fontWeight: "700" }}>저장</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDraft(comment.content);
                setIsEditing(false);
              }}
            >
              <Text style={{ color: "#64748b", fontWeight: "700" }}>취소</Text>
            </Pressable>
          </>
        ) : null}
        {isMine && !isEditing ? (
          <>
            <Pressable onPress={() => setIsEditing(true)}>
              <Text style={{ color: "#334155", fontWeight: "700" }}>수정</Text>
            </Pressable>
            <Pressable onPress={() => onDelete?.(comment.id)}>
              <Text style={{ color: "#b91c1c", fontWeight: "700" }}>삭제</Text>
            </Pressable>
          </>
        ) : null}
        {!isMine && reportedTargets[`comment:${comment.id}`] ? (
          <Text style={{ color: "#15803d", fontWeight: "700" }}>신고됨</Text>
        ) : null}
        {!isMine && onReport && !reportedTargets[`comment:${comment.id}`] ? (
          <Pressable onPress={() => onReport({ type: "comment", id: comment.id, label: `댓글 #${comment.id}` })}>
            <Text style={{ color: "#b91c1c", fontWeight: "700" }}>신고</Text>
          </Pressable>
        ) : null}
      </View>
      {comment.children.map((child) => (
        <CommentItem
          key={child.id}
          comment={child}
          currentUserId={currentUserId}
          depth={depth + 1}
          onDelete={onDelete}
          onEdit={onEdit}
          onReport={onReport}
          reportedTargets={reportedTargets}
          onReply={onReply}
        />
      ))}
    </View>
  );
}
