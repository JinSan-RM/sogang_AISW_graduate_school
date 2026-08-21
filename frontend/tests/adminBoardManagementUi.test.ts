import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

import type { Board } from "../types";

const navigatorSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardManagementNavigator.tsx"),
  "utf8",
);
const settingsSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardSettingsPanel.tsx"),
  "utf8",
);
const adminSource = readFileSync(join(process.cwd(), "app", "admin", "index.tsx"), "utf8");
const nodeRequire = createRequire(import.meta.url);

function loadNavigatorModule() {
  const compiled = ts.transpileModule(navigatorSource, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  const categories: Record<string, string[]> = {
    notices: ["notices"],
    community: ["community", "resources"],
    participation: ["participation", "club", "study", "alumni"],
    council: ["council", "gsa"],
  };
  const mockRequire = (id: string) => {
    if (id === "react-native") return { Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" };
    if (id === "../../utils/adminContentManagement") {
      return {
        adminBoardsForScope: (boards: Board[], scope: string) => scope === "all" ? boards : boards.filter((board) => categories[scope]?.includes(board.category)),
        adminScopeForBoard: (board: Board) => Object.entries(categories).find(([, values]) => values.includes(board.category))?.[0] ?? "all",
        nextAdminBoardSelection: (boards: Board[], currentBoardId: number | null, scope: string) => {
          if (scope === "all") return null;
          const visible = boards.filter((board) => categories[scope]?.includes(board.category));
          return visible.some((board) => board.id === currentBoardId) ? currentBoardId : visible[0]?.id ?? null;
        },
      };
    }
    return nodeRequire(id);
  };
  new Function("module", "exports", "require", compiled)(module, module.exports, mockRequire);
  return module.exports as Record<string, (...args: unknown[]) => unknown>;
}

const board = (id: number, category: string): Board => ({
  id,
  name: `게시판 ${id}`,
  slug: `board-${id}`,
  category,
  board_type: "post",
  sort_order: id,
  allow_anonymous: false,
  read_permission: "user",
  write_permission: "user",
  is_active: true,
});

type RenderedElement = { type?: unknown; props?: { children?: unknown; disabled?: boolean } };

function renderedElements(node: unknown): RenderedElement[] {
  if (Array.isArray(node)) return node.flatMap(renderedElements);
  if (!node || typeof node !== "object") return [];
  const element = node as RenderedElement;
  return [element, ...renderedElements(element.props?.children)];
}

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
  assert.match(adminSource, /adminBoardScopeTransition\(boards, boardManagementBoardId, nextScope\)/);
  assert.match(adminSource, /adminBoardSelectionTransition\(boardId\)/);
  assert.match(adminSource, /adminBoardCreateTransition\(\)/);
  assert.match(adminSource, /setBoardManagementTab\(transition\.tab\)/);
});

test("기존 게시판 저장은 구조 식별자를 제외하는 공통 payload 경계를 사용한다", () => {
  assert.match(adminSource, /updateAdminBoard\([\s\S]*?adminBoardSettingsPayload\(/);
  assert.match(settingsSource, /allow_anonymous: "allowAnonymous"/);
  assert.match(settingsSource, /write_permission: "writePermission"/);
  assert.match(settingsSource, /read_permission: "readPermission"/);
  assert.match(settingsSource, /disabled=\{saving \|\| lockedDraftFields\.has\("allowAnonymous"\)\}/);
});

test("탐색 모델은 전체 가상 선택과 실제 게시판이 없는 운영 설정을 구분한다", () => {
  const navigatorModule = loadNavigatorModule();
  const boards = [board(1, "notices"), board(2, "community")];
  const allModel = navigatorModule.adminBoardNavigatorModel(boards, "all", null, false) as {
    boardOptions: { id: number | null; label: string }[];
    tabs: { key: string }[];
  };
  assert.deepEqual(allModel.boardOptions.map((option) => option.id), [null, 1, 2]);
  assert.equal(allModel.boardOptions[0]?.label, "모든 게시판");
  assert.deepEqual(allModel.tabs.map((tab) => tab.key), ["content"]);

  const orphanModel = navigatorModule.adminBoardNavigatorModel(boards, "notices", 999, false) as { tabs: { key: string }[] };
  assert.deepEqual(orphanModel.tabs.map((tab) => tab.key), ["content"]);
  const selectedModel = navigatorModule.adminBoardNavigatorModel(boards, "notices", 1, false) as { tabs: { key: string }[] };
  assert.deepEqual(selectedModel.tabs.map((tab) => tab.key), ["content", "settings"]);
});

test("그룹·게시판 전환과 새 게시판 생성 생명주기는 명시적인 상태 전이를 사용한다", () => {
  const navigatorModule = loadNavigatorModule();
  const boards = [board(1, "notices"), board(2, "community")];
  assert.deepEqual(navigatorModule.adminBoardScopeTransition(boards, 2, "notices"), {
    scope: "notices", boardId: 1, tab: "content", creatingBoard: false,
  });
  assert.deepEqual(navigatorModule.adminBoardSelectionTransition(2), {
    boardId: 2, tab: "content", creatingBoard: false,
  });
  assert.deepEqual(navigatorModule.adminBoardCreateTransition(), { tab: "settings", creatingBoard: true });
  assert.deepEqual(navigatorModule.adminBoardCreateCancelTransition(), { tab: "content", creatingBoard: false });
  assert.deepEqual(navigatorModule.adminBoardCreatedTransition(board(2, "community")), {
    scope: "community", boardId: 2, tab: "settings", creatingBoard: false,
  });

  const creationResult = navigatorModule.adminBoardCreationResult(
    [board(1, "notices"), board(2, "community")],
    { ...board(3, "community"), name: "새 게시판" },
  ) as { boards: Board[]; transition: { scope: string; boardId: number | null; tab: string; creatingBoard: boolean } };
  assert.deepEqual(creationResult.boards.map((item) => item.id), [1, 2, 3]);
  assert.equal(creationResult.boards[2]?.name, "새 게시판");
  assert.equal(creationResult.transition.boardId, 3);
  const createdModel = navigatorModule.adminBoardNavigatorModel(
    creationResult.boards,
    creationResult.transition.scope,
    creationResult.transition.boardId,
    creationResult.transition.creatingBoard,
  ) as { tabs: { key: string }[] };
  assert.deepEqual(createdModel.tabs.map((tab) => tab.key), ["content", "settings"]);
  const deduplicated = navigatorModule.adminBoardsWithCreatedBoard(
    creationResult.boards,
    { ...board(3, "community"), name: "갱신된 새 게시판" },
  ) as Board[];
  assert.deepEqual(deduplicated.map((item) => item.id), [1, 2, 3]);
  assert.equal(deduplicated[2]?.name, "갱신된 새 게시판");
});

test("설정 저장은 대상 게시판 일치 여부를 확인하고 네비게이션과 draft를 보호한다", () => {
  const navigatorModule = loadNavigatorModule();
  assert.equal(navigatorModule.isBoardSettingsTargetCurrent(1, 1), true);
  assert.equal(navigatorModule.isBoardSettingsTargetCurrent(1, 2), false);
  const originalDraft = { name: "기존 draft" };
  const savedDraft = { name: "서버 응답" };
  assert.equal(navigatorModule.boardSettingsDraftAfterResult(1, 2, originalDraft, savedDraft, "success"), originalDraft);
  assert.equal(navigatorModule.boardSettingsDraftAfterResult(1, 1, originalDraft, savedDraft, "success"), savedDraft);
  assert.equal(navigatorModule.boardSettingsDraftAfterResult(1, 1, originalDraft, savedDraft, "failure"), originalDraft);
  const rendered = navigatorModule.default({
    boards: [board(1, "notices")],
    scope: "notices",
    selectedBoardId: 1,
    selectedTab: "settings",
    creatingBoard: false,
    disabled: true,
    onScopeChange: () => undefined,
    onBoardChange: () => undefined,
    onTabChange: () => undefined,
    onCreateBoard: () => undefined,
  });
  const navigationButtons = renderedElements(rendered).filter((element) => element.type === "Pressable");
  assert.ok(navigationButtons.length > 0);
  assert.equal(navigationButtons.every((element) => element.props?.disabled === true), true);

  const saveHandler = adminSource.slice(
    adminSource.indexOf("const handleSaveBoardSettings"),
    adminSource.indexOf("const handleCancelBoardForm"),
  );
  assert.match(saveHandler, /const targetBoardId = selectedManagedBoard\.id/);
  assert.match(saveHandler, /isBoardSettingsTargetCurrent\(targetBoardId, boardManagementBoardIdRef\.current\)/);
  assert.match(saveHandler, /boardSettingsDraftAfterResult\(/);
  assert.match(saveHandler, /invalidateQueries\(\{ queryKey: \["admin-boards"\] \}\)/);
  assert.match(saveHandler, /invalidateQueries\(\{ queryKey: \["boards"\] \}\)/);
  assert.match(adminSource, /disabled=\{boardSettingsSaving\}/);
  assert.match(adminSource, /setQueryData<AdminBoardsQueryData>/);
  assert.match(adminSource, /setOptimisticManagedBoard\(created\.data\)/);
  assert.match(adminSource, /board !== optimisticManagedBoard/);
  assert.match(settingsSource, /editable=\{!saving\}/);
  const catchClause = saveHandler.slice(saveHandler.lastIndexOf("} catch {"), saveHandler.indexOf("} finally"));
  assert.doesNotMatch(catchClause, /setBoardSettingsDraft/);
});
