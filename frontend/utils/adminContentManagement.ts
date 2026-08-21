import type { Board, MediaAsset, PostDetail } from "../types";

export type AdminContentScope = "all" | "notices" | "participation" | "community" | "council";

export type AdminBoardContentKind =
  | "notice"
  | "participation-guide"
  | "suggestion"
  | "mutual-aid"
  | "album"
  | "activity-certification"
  | "activity-history"
  | "resource"
  | "standard";

export type AdminBoardDedicatedSection = "notices" | "suggestions" | "mutualAid";

export type AdminBoardContentControl = {
  kind: AdminBoardContentKind;
  description: string;
  createLabel: string | null;
  dedicatedSection: AdminBoardDedicatedSection | null;
  dedicatedLabel: string | null;
  canReplaceRepresentativeImage: boolean;
};

const ADMIN_CONTENT_BOARD_TYPES = new Set([
  "notice",
  "album",
  "resource",
  "activity_certification",
  "activity_history",
  "suggestion",
  "mutual_aid",
  "post",
]);

const SCOPE_CATEGORIES: Record<Exclude<AdminContentScope, "all">, readonly string[]> = {
  notices: ["notices"],
  participation: ["participation", "club", "study", "alumni"],
  community: ["community", "resources"],
  council: ["council", "gsa"],
};

export function adminContentBoards(boards: Board[], scope: AdminContentScope): Board[] {
  const categories = scope === "all" ? null : SCOPE_CATEGORIES[scope];
  return boards
    .filter((board) => ADMIN_CONTENT_BOARD_TYPES.has(board.board_type))
    .filter((board) => categories === null || categories.includes(board.category))
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
}

export function adminBoardContentControl(board?: Board): AdminBoardContentControl {
  if (!board) {
    return {
      kind: "standard",
      description: "게시글을 검색하고 열기, 수정, 고정과 삭제를 관리합니다.",
      createLabel: null,
      dedicatedSection: null,
      dedicatedLabel: null,
      canReplaceRepresentativeImage: false,
    };
  }

  if (board.board_type === "notice") {
    return {
      kind: "notice",
      description: "공지 분류, 이미지, 상단 고정과 원우회 활동 연동을 공지사항 관리에서 설정합니다.",
      createLabel: null,
      dedicatedSection: "notices",
      dedicatedLabel: "공지사항 관리",
      canReplaceRepresentativeImage: false,
    };
  }

  if (board.slug === "club-promo") {
    return {
      kind: "participation-guide",
      description: "대표 이미지, 동아리 소개와 가입 신청 링크를 관리합니다.",
      createLabel: "동아리 안내 등록",
      dedicatedSection: null,
      dedicatedLabel: null,
      canReplaceRepresentativeImage: true,
    };
  }

  if (board.slug === "networking-programs") {
    return {
      kind: "participation-guide",
      description: "대표 이미지, 네트워킹 소개와 참가 신청 링크를 관리합니다.",
      createLabel: "네트워킹 안내 등록",
      dedicatedSection: null,
      dedicatedLabel: null,
      canReplaceRepresentativeImage: true,
    };
  }

  if (board.board_type === "suggestion") {
    return {
      kind: "suggestion",
      description: "접수 상태와 공식 답변은 건의사항 답변 관리에서 처리합니다.",
      createLabel: null,
      dedicatedSection: "suggestions",
      dedicatedLabel: "건의사항 답변 관리",
      canReplaceRepresentativeImage: false,
    };
  }

  if (board.board_type === "mutual_aid") {
    return {
      kind: "mutual-aid",
      description: "비공개 증빙 확인, 처리 완료와 반려는 상조회 신청 관리에서 처리합니다.",
      createLabel: null,
      dedicatedSection: "mutualAid",
      dedicatedLabel: "상조회 신청 관리",
      canReplaceRepresentativeImage: false,
    };
  }

  if (board.board_type === "album") {
    return {
      kind: "album",
      description: "행사 사진을 이미지 중심 게시글로 관리합니다.",
      createLabel: board.write_permission === "admin" ? `${board.name} 등록` : null,
      dedicatedSection: null,
      dedicatedLabel: null,
      canReplaceRepresentativeImage: false,
    };
  }

  if (board.board_type === "activity_certification") {
    return {
      kind: "activity-certification",
      description: "활동일, 참여자와 활동 사진을 확인하고 게시글 상태를 관리합니다.",
      createLabel: null,
      dedicatedSection: null,
      dedicatedLabel: null,
      canReplaceRepresentativeImage: false,
    };
  }

  if (board.board_type === "activity_history") {
    return {
      kind: "activity-history",
      description: "원우회 활동내역은 공지사항의 활동내역 연동 옵션으로 관리합니다.",
      createLabel: null,
      dedicatedSection: "notices",
      dedicatedLabel: "연동 공지 관리",
      canReplaceRepresentativeImage: false,
    };
  }

  if (board.board_type === "resource") {
    return {
      kind: "resource",
      description: "자료 파일, 게시판 분류와 작성자 표시 정책을 유지하며 게시글을 관리합니다.",
      createLabel: board.write_permission === "admin" ? `${board.name} 등록` : null,
      dedicatedSection: null,
      dedicatedLabel: null,
      canReplaceRepresentativeImage: false,
    };
  }

  return {
    kind: "standard",
    description: "게시글을 검색하고 열기, 수정, 고정과 삭제를 관리합니다.",
    createLabel: board.write_permission === "admin" ? `${board.name} 등록` : null,
    dedicatedSection: null,
    dedicatedLabel: null,
    canReplaceRepresentativeImage: false,
  };
}

export function nextAdminContentSelection(
  boards: Board[],
  currentBoardId: number | null,
  nextScope: AdminContentScope,
): number | null {
  if (nextScope === "all") return null;
  const visibleBoards = adminContentBoards(boards, nextScope);
  if (visibleBoards.some((board) => board.id === currentBoardId)) return currentBoardId;
  return visibleBoards[0]?.id ?? null;
}

export function replaceRepresentativeImage(attachments: MediaAsset[], replacement: MediaAsset): MediaAsset[] {
  const currentIndex = attachments.findIndex((attachment) => attachment.content_type.startsWith("image/"));
  if (currentIndex < 0) return [replacement, ...attachments];
  return attachments.map((attachment, index) => index === currentIndex ? replacement : attachment);
}

export function representativeImageUpdatePayload(detail: PostDetail, replacement: MediaAsset) {
  return {
    title: detail.title,
    content: detail.content,
    category: detail.category,
    is_anonymous: detail.is_anonymous,
    metadata: detail.metadata,
    attachment_ids: replaceRepresentativeImage(detail.attachments, replacement).map((attachment) => attachment.id),
    deadline_at: detail.deadline_at,
  };
}
