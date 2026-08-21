import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const navigatorSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardManagementNavigator.tsx"),
  "utf8",
);
const settingsSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardSettingsPanel.tsx"),
  "utf8",
);
const adminSource = readFileSync(join(process.cwd(), "app", "admin", "index.tsx"), "utf8");

test("통합 탐색기는 그룹 게시판 콘텐츠 운영설정 탭을 제공한다", () => {
  assert.match(navigatorSource, /전체/);
  assert.match(navigatorSource, /커뮤니티·자료/);
  assert.match(navigatorSource, /accessibilityRole="tab"/);
  assert.match(navigatorSource, /콘텐츠/);
  assert.match(navigatorSource, /운영 설정/);
});

test("관리자 화면은 통합 선택 상태를 하나만 소유한다", () => {
  assert.match(adminSource, /boardManagementScope/);
  assert.match(adminSource, /boardManagementBoardId/);
  assert.match(adminSource, /boardManagementTab/);
});

test("운영 설정은 구조 식별자와 잠긴 정책을 읽기 전용으로 표시한다", () => {
  assert.match(settingsSource, /구조 식별자 · 변경 불가/);
  assert.match(settingsSource, /settingKey/);
  assert.match(navigatorSource, /새 게시판 등록/);
});

test("통합 탐색기와 설정 패널은 부모가 소유한 선택과 draft만 사용한다", () => {
  assert.doesNotMatch(navigatorSource, /useState/);
  assert.doesNotMatch(settingsSource, /useState/);
  assert.match(adminSource, /setBoardManagementBoardId\(nextAdminBoardSelection/);
  assert.match(adminSource, /setBoardManagementTab\("content"\)/);
  assert.match(adminSource, /setBoardManagementTab\("settings"\)/);
});

test("기존 게시판 저장은 구조 식별자를 제외하는 공통 payload 경계를 사용한다", () => {
  assert.match(adminSource, /updateAdminBoard\([\s\S]*?adminBoardSettingsPayload\(/);
  assert.match(settingsSource, /allow_anonymous: "allowAnonymous"/);
  assert.match(settingsSource, /write_permission: "writePermission"/);
  assert.match(settingsSource, /read_permission: "readPermission"/);
  assert.match(settingsSource, /disabled=\{lockedDraftFields\.has\("allowAnonymous"\)\}/);
});
