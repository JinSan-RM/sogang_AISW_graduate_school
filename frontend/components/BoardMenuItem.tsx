import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { Board } from "../types";

type Props = {
  board: Board;
  onPress: (board: Board) => void;
};

const BOARD_LABELS: Record<string, { name: string; description?: string }> = {
  "academic-notices": { name: "학사 공지", description: "학사 안내와 학교 공지를 확인하세요." },
  "event-notices": { name: "행사 공지", description: "학생회와 학교 행사 소식을 확인하세요." },
  "event-album": { name: "행사 앨범", description: "학교와 학생회 행사 기록을 둘러보세요." },
  "lecture-reviews": { name: "강의 후기", description: "강의 후기와 수강 경험을 공유하세요." },
  "exam-archive": { name: "시험 자료실", description: "시험 자료와 학습 자료를 공유하세요." },
  "comprehensive-exam": { name: "종합시험", description: "종합시험 정보와 준비 자료를 확인하세요." },
  "club-activity": { name: "동아리 활동 인증", description: "동아리 활동 인증 게시글을 작성하고 확인하세요." },
  "study-activity": { name: "스터디 활동 인증", description: "스터디 활동 인증 게시글을 작성하고 확인하세요." },
  "networking-activity": { name: "네트워킹 활동 인증", description: "멘토링과 네트워킹 활동 기록을 확인하세요." },
  "council-activity": { name: "학생회 활동 내역", description: "학생회 활동과 결과를 확인하세요." },
  accounting: { name: "회계 공개", description: "학생회 회계와 예산 집행 자료를 확인하세요." },
  suggestions: { name: "건의사항", description: "건의사항을 남기고 공식 답변을 확인하세요." },
  "mutual-aid": { name: "상호부조", description: "상호부조 안내와 지원 정보를 확인하세요." },
};

export default function BoardMenuItem({ board, onPress }: Props) {
  const label = BOARD_LABELS[board.slug];
  const name = label?.name ?? board.name;
  const description = label?.description ?? board.description;

  return (
    <Pressable onPress={() => onPress(board)}>
      <View
        style={{
          marginBottom: 10,
          padding: 14,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#dbe3ef",
          backgroundColor: "#ffffff",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: "#111827", fontSize: 16, fontWeight: "900" }}>{name}</Text>
            {description ? (
              <Text style={{ color: "#64748b", marginTop: 4, lineHeight: 19 }} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </View>
    </Pressable>
  );
}
