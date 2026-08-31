import assert from "node:assert/strict";
import test from "node:test";

import type { Board } from "../types";
import {
  adminBoardSettingsDraft,
  adminBoardSettingsPayload,
  externalLinkMetadata,
  validateExternalHttpUrl,
} from "../utils/adminBoardSettings";

const board: Board = {
  id: 1,
  name: "기존 게시판",
  slug: "existing-board",
  category: "community",
  board_type: "post",
  description: "기존 설명",
  sort_order: 4,
  allow_anonymous: true,
  read_permission: "public",
  write_permission: "user",
  is_active: true,
  metadata: { legacy: "keep" },
};

test("기존 게시판 설정 payload는 slug category board_type metadata를 덮어쓰지 않는다", () => {
  const draft = adminBoardSettingsDraft(board);
  const payload = adminBoardSettingsPayload({ ...draft, name: "새 이름", sortOrder: "17" });

  assert.deepEqual(payload, {
    name: "새 이름",
    description: board.description,
    sort_order: 17,
    allow_anonymous: board.allow_anonymous,
    read_permission: board.read_permission,
    write_permission: board.write_permission,
    is_active: board.is_active,
  });
  assert.equal("slug" in payload, false);
  assert.equal("category" in payload, false);
  assert.equal("board_type" in payload, false);
  assert.equal("metadata" in payload, false);
});

test("활동인증 게시판은 이미지 레이아웃 설정을 metadata에 저장하고 기존 metadata를 보존한다", () => {
  const activityBoard = { ...board, board_type: "activity_certification", metadata: { legacy: "keep" } };
  const draft = adminBoardSettingsDraft(activityBoard);
  const payload = adminBoardSettingsPayload({
    ...draft,
    activityImageLayout: {
      version: 1,
      default: { max_width: null, height: null, max_height: 600, fit: "contain", expandable: true },
      landscape: null,
      portrait: null,
    },
  }, activityBoard);
  assert.deepEqual(payload.metadata, {
    legacy: "keep",
    activity_image_layout: {
      version: 1,
      default: { max_width: null, height: null, max_height: 600, fit: "contain", expandable: true },
      landscape: null,
      portrait: null,
    },
  });
});

test("비활동 게시판 payload에는 activity image metadata를 추가하지 않는다", () => {
  const draft = adminBoardSettingsDraft(board);
  const payload = adminBoardSettingsPayload(draft);
  assert.equal("metadata" in payload, false);
});

test("활동인증 이미지 레이아웃의 범위를 벗어난 값은 payload에서 거절한다", () => {
  const activityBoard = { ...board, board_type: "activity_certification" };
  const draft = adminBoardSettingsDraft(activityBoard);
  assert.throws(
    () => adminBoardSettingsPayload({ ...draft, activityImageLayout: { ...draft.activityImageLayout!, default: { ...draft.activityImageLayout!.default, max_width: 119 } } }, activityBoard),
    (error: unknown) => error instanceof Error && error.message === "INVALID_ACTIVITY_IMAGE_LAYOUT",
  );
});

test("게시판 이름과 정렬 순서는 비어 있거나 숫자가 아니면 거절한다", () => {
  const draft = adminBoardSettingsDraft(board);

  assert.throws(
    () => adminBoardSettingsPayload({ ...draft, name: "   " }),
    (error: unknown) => error instanceof Error && error.message === "INVALID_BOARD_SETTINGS",
  );
  assert.throws(
    () => adminBoardSettingsPayload({ ...draft, sortOrder: "not-a-number" }),
    (error: unknown) => error instanceof Error && error.message === "INVALID_BOARD_SETTINGS",
  );
});

test("빈 게시판 설명은 기존 설명을 지울 수 있도록 null로 전송한다", () => {
  const draft = adminBoardSettingsDraft(board);
  assert.equal(adminBoardSettingsPayload({ ...draft, description: "   " }).description, null);
});

test("외부 링크 변경은 알 수 없는 기존 metadata를 보존한다", () => {
  const legacyBoard = { ...board, metadata: { notion_url: "https://old.example.com", analytics_key: "accounting" } };
  assert.deepEqual(externalLinkMetadata(legacyBoard, "https://example.com/new"), {
    notion_url: "https://example.com/new",
    analytics_key: "accounting",
  });
});

test("외부 링크는 기존 URL key를 우선순위에 따라 바꾼다", () => {
  const legacyBoard = { ...board, metadata: { url: "https://old.example.com", link: "https://other.example.com" } };
  assert.deepEqual(externalLinkMetadata(legacyBoard, "http://example.com/new"), {
    url: "http://example.com/new",
    link: "https://other.example.com",
  });
});

test("외부 링크는 notion_url, external_url, url, link 순서로 첫 문자열 key를 바꾼다", () => {
  const legacyBoard = {
    ...board,
    metadata: {
      notion_url: "https://notion.example.com",
      external_url: "https://external.example.com",
      url: "https://url.example.com",
      link: "https://link.example.com",
    },
  };
  assert.deepEqual(externalLinkMetadata(legacyBoard, "https://new.example.com"), {
    notion_url: "https://new.example.com",
    external_url: "https://external.example.com",
    url: "https://url.example.com",
    link: "https://link.example.com",
  });
});

test("외부 링크는 앞선 인식 key가 문자열이 아니면 다음 문자열 key를 바꾼다", () => {
  const legacyBoard = {
    ...board,
    metadata: {
      notion_url: 123,
      external_url: "https://external.example.com",
      url: "https://url.example.com",
      link: "https://link.example.com",
    },
  };
  assert.deepEqual(externalLinkMetadata(legacyBoard, "https://new.example.com"), {
    notion_url: 123,
    external_url: "https://new.example.com",
    url: "https://url.example.com",
    link: "https://link.example.com",
  });
});

test("외부 링크 metadata가 없으면 external_url을 추가한다", () => {
  assert.deepEqual(externalLinkMetadata(board, "https://example.com/new"), {
    legacy: "keep",
    external_url: "https://example.com/new",
  });
});

test("외부 링크는 http 또는 https만 허용한다", () => {
  assert.equal(validateExternalHttpUrl("javascript:alert(1)"), "http 또는 https 주소를 입력하세요.");
  assert.equal(validateExternalHttpUrl("   "), "http 또는 https 주소를 입력하세요.");
  assert.equal(validateExternalHttpUrl("https://example.com/path"), null);
  assert.equal(validateExternalHttpUrl("http://example.com/path"), null);
});
