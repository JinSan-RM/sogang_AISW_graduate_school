import assert from "node:assert/strict";
import test from "node:test";

import type { Board, MediaAsset, PostDetail } from "../types";
import {
  adminBoardCapability,
  adminBoardContentControl,
  adminBoardDestinationForLegacySection,
  adminBoardDestinationForSlug,
  adminBoardLegacySectionTransition,
  adminBoardsForScope,
  adminCalendarQueryEnabled,
  adminFaqQueryEnabled,
  adminScopeForBoard,
  adminContentBoards,
  nextAdminBoardSelection,
  nextAdminContentSelection,
  replaceRepresentativeImage,
  representativeImageUpdatePayload,
} from "../utils/adminContentManagement";

function board(overrides: Partial<Board> & Pick<Board, "id" | "name" | "slug" | "category" | "board_type">): Board {
  return {
    sort_order: overrides.id,
    allow_anonymous: false,
    read_permission: "public",
    write_permission: "user",
    ...overrides,
  };
}

function media(id: number, contentType: string, filename = `media-${id}`): MediaAsset {
  return {
    id,
    original_filename: filename,
    content_type: contentType,
    file_size: 1024,
    url: `/media/${id}`,
  };
}

const boards: Board[] = [
  board({ id: 20, name: "임원진 소개", slug: "gsa-executives", category: "gsa", board_type: "organization_intro" }),
  board({ id: 21, name: "기장단 소개", slug: "gsa-cohort-leaders", category: "gsa", board_type: "organization_intro" }),
  board({ id: 22, name: "역대 원우회", slug: "gsa-past-councils", category: "gsa", board_type: "organization_intro" }),
  board({ id: 12, name: "네트워킹 안내", slug: "networking-programs", category: "alumni", board_type: "post", sort_order: 40, write_permission: "admin" }),
  board({ id: 2, name: "학사 일정", slug: "academic-calendar", category: "notices", board_type: "calendar" }),
  board({ id: 8, name: "스터디 모집", slug: "study-recruit", category: "study", board_type: "post", sort_order: 30 }),
  board({ id: 1, name: "학사 공지", slug: "academic-notices", category: "notices", board_type: "notice", write_permission: "admin" }),
  board({ id: 5, name: "동아리 활동 인증", slug: "club-activity", category: "participation", board_type: "activity_certification", sort_order: 10 }),
  board({ id: 6, name: "동아리 홍보", slug: "club-promo", category: "club", board_type: "post", sort_order: 20, write_permission: "admin" }),
  board({ id: 11, name: "시험족보", slug: "exam-archive", category: "resources", board_type: "resource" }),
  board({ id: 10, name: "행사 사진첩", slug: "event-album", category: "community", board_type: "album" }),
  board({ id: 13, name: "원우회 활동내역", slug: "council-activity", category: "council", board_type: "activity_history", write_permission: "admin" }),
  board({ id: 14, name: "건의사항", slug: "suggestions", category: "council", board_type: "suggestion" }),
  board({ id: 15, name: "상조회", slug: "mutual-aid", category: "council", board_type: "mutual_aid" }),
  board({ id: 16, name: "건의사항 피드백", slug: "gsa-feedback", category: "gsa", board_type: "post", write_permission: "admin" }),
  board({ id: 17, name: "FAQ", slug: "gsa-faq", category: "gsa", board_type: "faq", write_permission: "admin" }),
];

const registryBoards: Board[] = [
  board({ id: 1, name: "전체 공지", slug: "all-notices", category: "notices", board_type: "notice" }),
  board({ id: 2, name: "학사 일정", slug: "academic-calendar", category: "notices", board_type: "calendar" }),
  board({ id: 3, name: "회계", slug: "accounting", category: "council", board_type: "external_link" }),
  board({ id: 4, name: "임원진 소개", slug: "gsa-executives", category: "gsa", board_type: "organization_intro" }),
  board({ id: 5, name: "FAQ", slug: "gsa-faq", category: "gsa", board_type: "faq" }),
  board({ id: 6, name: "로드맵", slug: "gsa-roadmap-benefits", category: "gsa", board_type: "guide" }),
  board({ id: 7, name: "알 수 없는 게시판", slug: "future-board", category: "future", board_type: "future" }),
];

const capabilityBoards: Board[] = [
  board({ id: 8, name: "강의 후기", slug: "lecture-reviews", category: "community", board_type: "post" }),
  board({ id: 9, name: "시험 족보", slug: "exam-archive", category: "resources", board_type: "resource" }),
  board({ id: 10, name: "네트워킹", slug: "networking-programs", category: "alumni", board_type: "post" }),
];

const allFixtureBoards = [...boards, ...registryBoards, ...capabilityBoards];
const boardBySlug = (slug: string): Board => {
  const found = allFixtureBoards.find((item) => item.slug === slug);
  assert.ok(found, `missing board fixture: ${slug}`);
  return found;
};

test("그룹은 표준 게시글이 없는 게시판까지 모두 포함한다", () => {
  assert.deepEqual(adminBoardsForScope(registryBoards, "notices").map((item) => item.slug), ["all-notices", "academic-calendar"]);
  assert.deepEqual(adminBoardsForScope(registryBoards, "council").map((item) => item.slug), ["accounting", "gsa-executives", "gsa-faq", "gsa-roadmap-benefits"]);
});

test("알 수 없는 category는 전체에만 표시한다", () => {
  assert.deepEqual(adminBoardsForScope(registryBoards, "all").map((item) => item.slug), [
    "all-notices", "academic-calendar", "accounting", "gsa-executives", "gsa-faq", "gsa-roadmap-benefits", "future-board",
  ]);
  assert.equal(adminBoardsForScope(registryBoards, "community").some((item) => item.slug === "future-board"), false);
});

test("게시판 유형은 기존 전용 편집기 capability로 연결된다", () => {
  assert.equal(adminBoardCapability(boardBySlug("academic-calendar")).kind, "calendar");
  assert.equal(adminBoardCapability(boardBySlug("accounting")).kind, "external-link");
  assert.equal(adminBoardCapability(boardBySlug("gsa-executives")).kind, "organization-intro");
  assert.equal(adminBoardCapability(boardBySlug("gsa-faq")).kind, "faq");
  assert.deepEqual(adminBoardCapability(boardBySlug("gsa-roadmap-benefits")), { kind: "guide", contentAvailable: false, canReplaceRepresentativeImage: false, lockedPolicies: [] });
});

test("모든 지원 게시판 유형은 literal capability를 제공한다", () => {
  assert.equal(adminBoardCapability().kind, "aggregate-posts");
  assert.equal(adminBoardCapability(boardBySlug("all-notices")).kind, "notice");
  assert.equal(adminBoardCapability(boardBySlug("lecture-reviews")).kind, "posts");
  assert.equal(adminBoardCapability(boards.find((item) => item.slug === "event-album")).kind, "album");
  assert.equal(adminBoardCapability(boardBySlug("exam-archive")).kind, "resource");
  assert.equal(adminBoardCapability(boards.find((item) => item.slug === "club-activity")).kind, "activity-certification");
  assert.equal(adminBoardCapability(boards.find((item) => item.slug === "council-activity")).kind, "activity-history");
  assert.equal(adminBoardCapability(boards.find((item) => item.slug === "suggestions")).kind, "suggestion");
  assert.equal(adminBoardCapability(boards.find((item) => item.slug === "mutual-aid")).kind, "mutual-aid");
});

test("커뮤니티 개인정보 정책은 잠긴 상태로 노출된다", () => {
  assert.deepEqual(adminBoardCapability(boardBySlug("lecture-reviews")).lockedPolicies.map((policy) => policy.key), ["forced-anonymous", "comments-disabled"]);
  assert.deepEqual(adminBoardCapability(boardBySlug("exam-archive")).lockedPolicies.map((policy) => policy.key), ["author-visible", "comments-enabled"]);
  assert.deepEqual(adminBoardCapability(boards.find((item) => item.slug === "suggestions")).lockedPolicies.map((policy) => policy.key), ["allow-anonymous"]);
  assert.deepEqual(adminBoardCapability(boards.find((item) => item.slug === "club-promo")).lockedPolicies.map((policy) => policy.key), ["admin-only-write"]);
  assert.deepEqual(adminBoardCapability(boardBySlug("networking-programs")).lockedPolicies.map((policy) => policy.key), ["admin-only-write"]);
});

test("대표 이미지 교체 capability는 동아리와 네트워킹에만 활성화된다", () => {
  for (const item of allFixtureBoards) {
    assert.equal(
      adminBoardCapability(item).canReplaceRepresentativeImage,
      item.slug === "club-promo" || item.slug === "networking-programs",
      item.slug,
    );
  }
});

test("category는 모든 화면에서 같은 관리자 scope로 계산한다", () => {
  assert.equal(adminScopeForBoard(boardBySlug("exam-archive")), "community");
  assert.equal(adminScopeForBoard(boardBySlug("networking-programs")), "participation");
  assert.equal(adminScopeForBoard(boardBySlug("gsa-executives")), "council");
});

test("전체는 모든 게시판 가상 선택을 유지하고 실제 그룹은 유효한 첫 게시판을 선택한다", () => {
  assert.equal(nextAdminBoardSelection(registryBoards, 99, "all"), null);
  assert.equal(nextAdminBoardSelection(registryBoards, null, "notices"), boardBySlug("all-notices").id);
  assert.equal(nextAdminBoardSelection([...registryBoards, ...capabilityBoards], boardBySlug("lecture-reviews").id, "community"), boardBySlug("lecture-reviews").id);
});

test("기존 관리자 section 링크는 모든 통합 게시판 목적지로 변환한다", () => {
  const cases = [
    ["notices", "all-notices"],
    ["executives", "gsa-executives"],
    ["cohortLeaders", "gsa-cohort-leaders"],
    ["pastCouncils", "gsa-past-councils"],
    ["suggestions", "suggestions"],
    ["mutualAid", "mutual-aid"],
    ["faqs", "gsa-faq"],
    ["events", "academic-calendar"],
  ] as const;

  for (const [section, slug] of cases) {
    const target = boardBySlug(slug);
    assert.deepEqual(adminBoardDestinationForLegacySection(section, allFixtureBoards), {
      scope: adminScopeForBoard(target),
      boardId: target.id,
      tab: "content",
    });
  }
});

test("전체 게시글과 기존 게시판 설정 링크는 통합 가상 선택과 정렬된 첫 게시판을 사용한다", () => {
  assert.deepEqual(adminBoardDestinationForLegacySection("posts", allFixtureBoards), {
    scope: "all",
    boardId: null,
    tab: "content",
  });
  assert.deepEqual(adminBoardDestinationForLegacySection("boards", registryBoards), {
    scope: "all",
    boardId: boardBySlug("all-notices").id,
    tab: "settings",
  });
});

test("레거시 대상 게시판이 없으면 전체 콘텐츠로 안전하게 대체하고 알 수 없는 section은 무시한다", () => {
  assert.deepEqual(adminBoardDestinationForLegacySection("events", []), {
    scope: "all",
    boardId: null,
    tab: "content",
  });
  assert.equal(adminBoardDestinationForLegacySection("dashboard", allFixtureBoards), null);
  assert.equal(adminBoardDestinationForLegacySection("unknown", allFixtureBoards), null);
});

test("raw 레거시 section 전이는 게시판 준비 후 링크별 한 번만 실행한다", () => {
  assert.equal(adminBoardLegacySectionTransition("events", null, allFixtureBoards, false), null);
  const events = adminBoardLegacySectionTransition("events", null, allFixtureBoards, true);
  assert.deepEqual(events, {
    handledSection: "events",
    destination: {
      scope: "notices",
      boardId: boardBySlug("academic-calendar").id,
      tab: "content",
    },
  });
  assert.equal(adminBoardLegacySectionTransition("events", "events", allFixtureBoards, true), null);
  assert.deepEqual(adminBoardLegacySectionTransition("events", "events:1", allFixtureBoards, true, "events:2"), {
    handledSection: "events:2",
    destination: {
      scope: "notices",
      boardId: boardBySlug("academic-calendar").id,
      tab: "content",
    },
  });
  assert.deepEqual(adminBoardLegacySectionTransition("faqs", "events", allFixtureBoards, true), {
    handledSection: "faqs",
    destination: {
      scope: "council",
      boardId: boardBySlug("gsa-faq").id,
      tab: "content",
    },
  });
  assert.deepEqual(adminBoardLegacySectionTransition("dashboard", "events", allFixtureBoards, true), {
    handledSection: "dashboard",
    destination: null,
  });
  assert.deepEqual(adminBoardLegacySectionTransition("events", "dashboard", allFixtureBoards, true), {
    handledSection: "events",
    destination: {
      scope: "notices",
      boardId: boardBySlug("academic-calendar").id,
      tab: "content",
    },
  });
});

test("대시보드 게시판 바로가기는 실제 slug와 탭을 통합 목적지로 계산한다", () => {
  assert.deepEqual(adminBoardDestinationForSlug("club-promo", allFixtureBoards), {
    scope: "participation",
    boardId: boardBySlug("club-promo").id,
    tab: "content",
  });
  assert.deepEqual(adminBoardDestinationForSlug("gsa-executives", allFixtureBoards, "settings"), {
    scope: "council",
    boardId: boardBySlug("gsa-executives").id,
    tab: "settings",
  });
  assert.deepEqual(adminBoardDestinationForSlug("missing", allFixtureBoards, "settings"), {
    scope: "all",
    boardId: null,
    tab: "content",
  });
});

test("FAQ와 일정 쿼리는 대시보드 집계와 해당 통합 콘텐츠에서만 활성화된다", () => {
  assert.equal(adminFaqQueryEnabled("dashboard", false, "aggregate-posts"), true);
  assert.equal(adminFaqQueryEnabled("accounts", false, "faq"), false);
  assert.equal(adminFaqQueryEnabled("boardManagement", true, "faq"), true);
  assert.equal(adminFaqQueryEnabled("boardManagement", true, "calendar"), false);

  assert.equal(adminCalendarQueryEnabled("dashboard", false, false, "aggregate-posts"), true);
  assert.equal(adminCalendarQueryEnabled("accounts", false, false, "calendar"), false);
  assert.equal(adminCalendarQueryEnabled("boardManagement", false, true, "calendar"), true);
  assert.equal(adminCalendarQueryEnabled("boardManagement", false, true, "faq"), false);
  assert.equal(adminCalendarQueryEnabled("accounts", true, false, "posts"), true);
});

test("참여활동 탭은 참여·동아리·스터디·동문 게시글 게시판만 정렬해 보여준다", () => {
  assert.deepEqual(
    adminContentBoards(boards, "participation").map((item) => item.slug),
    ["club-activity", "club-promo", "study-recruit", "networking-programs"],
  );
});

test("표준 게시글이 아닌 관리자 콘텐츠는 게시글 탭에서 제외한다", () => {
  assert.deepEqual(
    adminContentBoards(boards, "council").map((item) => item.slug),
    ["council-activity", "suggestions", "mutual-aid", "gsa-feedback"],
  );
  assert.equal(adminContentBoards(boards, "all").some((item) => item.slug === "gsa-executives"), false);
  assert.equal(adminContentBoards(boards, "all").some((item) => item.slug === "gsa-faq"), false);
  assert.equal(adminContentBoards(boards, "all").some((item) => item.slug === "academic-calendar"), false);
});

test("게시판 종류에 맞는 관리자 전용 제어를 선택한다", () => {
  assert.deepEqual(adminBoardContentControl(boards.find((item) => item.slug === "academic-notices")), {
    kind: "notice",
    description: "공지 분류, 이미지, 상단 고정과 원우회 활동 연동을 공지사항 관리에서 설정합니다.",
    createLabel: null,
    canReplaceRepresentativeImage: false,
  });
  assert.deepEqual(adminBoardContentControl(boards.find((item) => item.slug === "club-promo")), {
    kind: "participation-guide",
    description: "대표 이미지, 동아리 소개와 가입 신청 링크를 관리합니다.",
    createLabel: "동아리 안내 등록",
    canReplaceRepresentativeImage: true,
  });
  assert.deepEqual(adminBoardContentControl(boards.find((item) => item.slug === "networking-programs")), {
    kind: "participation-guide",
    description: "대표 이미지, 네트워킹 소개와 참가 신청 링크를 관리합니다.",
    createLabel: "네트워킹 안내 등록",
    canReplaceRepresentativeImage: true,
  });
  assert.equal(adminBoardContentControl(boards.find((item) => item.slug === "suggestions")).kind, "suggestion");
  assert.equal(adminBoardContentControl(boards.find((item) => item.slug === "mutual-aid")).kind, "mutual-aid");
  for (const item of boards) {
    const control = adminBoardContentControl(item);
    assert.equal("dedicatedSection" in control, false);
    assert.equal("dedicatedLabel" in control, false);
  }
  assert.equal(adminBoardContentControl(boards.find((item) => item.slug === "exam-archive")).kind, "resource");
  assert.equal(adminBoardContentControl(boards.find((item) => item.slug === "event-album")).kind, "album");
});

test("그룹 전환은 유효한 현재 게시판을 유지하고 아니면 첫 게시판을 선택한다", () => {
  assert.equal(nextAdminContentSelection(boards, 6, "participation"), 6);
  assert.equal(nextAdminContentSelection(boards, 1, "participation"), 5);
  assert.equal(nextAdminContentSelection(boards, 6, "all"), null);
  assert.equal(nextAdminContentSelection([], 6, "participation"), null);
});

test("대표 이미지 교체는 첫 이미지만 바꾸고 나머지 첨부 순서를 보존한다", () => {
  const document = media(1, "application/pdf", "guide.pdf");
  const oldHero = media(2, "image/jpeg", "old-hero.jpg");
  const gallery = media(3, "image/png", "gallery.png");
  const replacement = media(4, "image/webp", "new-hero.webp");

  assert.deepEqual(
    replaceRepresentativeImage([document, oldHero, gallery], replacement).map((item) => item.id),
    [document.id, replacement.id, gallery.id],
  );
  assert.deepEqual(
    replaceRepresentativeImage([document], replacement).map((item) => item.id),
    [replacement.id, document.id],
  );
});

test("대표 이미지 수정 payload는 이미지 외 게시글 필드를 그대로 보존한다", () => {
  const detail: PostDetail = {
    id: 99,
    board_id: 6,
    title: "SG_LLM",
    content: "동아리 소개",
    author_id: 1,
    author_nickname: "관리자",
    is_anonymous: false,
    is_pinned: true,
    is_notice: false,
    status: "published",
    category: "학술",
    metadata: { application_url: "https://example.com/apply", retained: true },
    attachments: [media(1, "application/pdf"), media(2, "image/jpeg")],
    view_count: 10,
    like_count: 2,
    comment_count: 1,
    is_liked: false,
    is_bookmarked: false,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
    deadline_at: "2026-09-01T00:00:00Z",
  };

  assert.deepEqual(representativeImageUpdatePayload(detail, media(3, "image/png")), {
    title: "SG_LLM",
    content: "동아리 소개",
    category: "학술",
    is_anonymous: false,
    metadata: { application_url: "https://example.com/apply", retained: true },
    attachment_ids: [1, 3],
    deadline_at: "2026-09-01T00:00:00Z",
  });
});
