import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

import type { Board } from "../types";
import type { AdminBoardCapability } from "../utils/adminContentManagement";

const navigatorSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardManagementNavigator.tsx"),
  "utf8",
);
const settingsSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardSettingsPanel.tsx"),
  "utf8",
);
const adminSource = readFileSync(join(process.cwd(), "app", "admin", "index.tsx"), "utf8");
const contentPanelSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardContentPanel.tsx"),
  "utf8",
);
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

function loadContentPanelModule() {
  const compiled = ts.transpileModule(contentPanelSource, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  const mockRequire = (id: string) => {
    if (id === "react-native") {
      return { ActivityIndicator: "ActivityIndicator", Pressable: "Pressable", Text: "Text", View: "View" };
    }
    return nodeRequire(id);
  };
  new Function("module", "exports", "require", compiled)(module, module.exports, mockRequire);
  return module.exports as Record<string, (...args: unknown[]) => unknown>;
}

function loadExternalLinkDraftTransitions() {
  const start = adminSource.indexOf("export type ExternalLinkDraftState");
  const end = adminSource.indexOf("function Panel", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const transitionSource = adminSource.slice(start, end);
  const compiled = ts.transpileModule(transitionSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  new Function("module", "exports", compiled)(module, module.exports);
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

type RenderedElement = {
  type?: unknown;
  props?: { children?: unknown; disabled?: boolean; onPress?: () => void };
};

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
  assert.deepEqual(navigatorModule.boardSettingsSaveResult(1, 1, originalDraft, savedDraft, "success"), {
    nextDraft: savedDraft,
    applyDraft: true,
    notification: "success",
  });
  assert.deepEqual(navigatorModule.boardSettingsSaveResult(1, 2, originalDraft, savedDraft, "success"), {
    nextDraft: originalDraft,
    applyDraft: false,
    notification: null,
  });
  assert.deepEqual(navigatorModule.boardSettingsSaveResult(1, 1, originalDraft, savedDraft, "failure"), {
    nextDraft: originalDraft,
    applyDraft: false,
    notification: "failure",
  });
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
  assert.equal((saveHandler.match(/boardSettingsSaveResult\(/g) ?? []).length, 2);
  assert.match(saveHandler, /invalidateQueries\(\{ queryKey: \["admin-boards"\] \}\)/);
  assert.match(saveHandler, /invalidateQueries\(\{ queryKey: \["boards"\] \}\)/);
  assert.match(adminSource, /disabled=\{boardSettingsSaving \|\| externalLinkSaving\}/);
  assert.match(adminSource, /setQueryData<AdminBoardsQueryData>/);
  assert.match(adminSource, /setOptimisticManagedBoard\(\{ board: created\.data, insertedGeneration \}\)/);
  assert.match(adminSource, /shouldClearOptimisticCreatedBoard\(/);
  assert.match(settingsSource, /editable=\{!saving\}/);
  const catchClause = saveHandler.slice(saveHandler.lastIndexOf("} catch {"), saveHandler.indexOf("} finally"));
  assert.doesNotMatch(catchClause, /setBoardSettingsDraft/);
});

test("생성 게시판 overlay는 생성 이후 성공한 서버 refresh에서만 해제한다", () => {
  const navigatorModule = loadNavigatorModule();
  const createdBoard = board(3, "community");
  assert.equal(navigatorModule.shouldClearOptimisticCreatedBoard(3, 10, 10, "success", [createdBoard]), false);
  assert.equal(navigatorModule.shouldClearOptimisticCreatedBoard(3, 10, 11, "error", [createdBoard]), false);
  assert.equal(navigatorModule.shouldClearOptimisticCreatedBoard(3, 10, 11, "success", [board(1, "notices")]), false);
  assert.equal(navigatorModule.shouldClearOptimisticCreatedBoard(3, 10, 11, "success", [createdBoard]), true);
});

test("콘텐츠 패널은 capability kind에 맞는 renderer 하나만 실행한다", () => {
  const contentPanelModule = loadContentPanelModule();
  const calls: string[] = [];
  const capability: AdminBoardCapability = {
    kind: "notice",
    contentAvailable: true,
    canReplaceRepresentativeImage: false,
    lockedPolicies: [],
  };
  const rendered = contentPanelModule.default({
    board: board(1, "notices"),
    capability,
    renderers: {
      posts: () => {
        calls.push("posts");
        return "게시글";
      },
      notice: () => {
        calls.push("notice");
        return "공지";
      },
    },
  }) as { props?: { children?: unknown } };

  assert.deepEqual(calls, ["notice"]);
  assert.equal(rendered.props?.children, "공지");
});

test("비활성 공지도 통합 화면에서는 admin endpoint 정책을 사용한다", () => {
  const contentPanelModule = loadContentPanelModule();
  const inactiveNotice = {
    ...board(77, "notices"),
    board_type: "notice",
    is_active: false,
  };
  const unifiedPolicy = contentPanelModule.adminBoardContentQueryPolicy({
    section: "boardManagement",
    tab: "content",
    kind: "notice",
    board: inactiveNotice,
  });
  assert.deepEqual(unifiedPolicy, {
    isManagedContentActive: true,
    showsStandardPosts: false,
    noticeSource: "admin",
    noticeBoardId: 77,
    showsSuggestions: false,
    showsMutualAid: false,
    showsActivityHistory: false,
  });

  const legacyPolicy = contentPanelModule.adminBoardContentQueryPolicy({
    section: "notices",
    tab: "content",
    kind: "notice",
    board: inactiveNotice,
  }) as { noticeSource: string; noticeBoardId?: number };
  assert.equal(legacyPolicy.noticeSource, "public");
  assert.equal(legacyPolicy.noticeBoardId, undefined);
});

test("public 공지 소비자는 비활성 선택을 첫 활성 공지로 보정한다", () => {
  const contentPanelModule = loadContentPanelModule();
  const inactiveNotice = { ...board(77, "notices"), board_type: "notice", is_active: false };
  const activeNotice = { ...board(88, "notices"), board_type: "notice", is_active: true };
  assert.equal(contentPanelModule.publicNoticeBoardSelection([inactiveNotice, activeNotice], 77), 88);
  assert.equal(contentPanelModule.publicNoticeBoardSelection([inactiveNotice, activeNotice], 88), 88);
  assert.equal(contentPanelModule.publicNoticeBoardSelection([inactiveNotice], 77), null);
});

test("공지 게시판 전환은 다른 게시판의 편집 상태만 초기화한다", () => {
  const contentPanelModule = loadContentPanelModule();
  assert.deepEqual(contentPanelModule.noticeEditorBoardTransition(1, 2, 1), {
    selectedBoardId: 2,
    shouldResetEditor: true,
  });
  assert.deepEqual(contentPanelModule.noticeEditorBoardTransition(1, 2, 2), {
    selectedBoardId: 2,
    shouldResetEditor: false,
  });
  assert.deepEqual(contentPanelModule.noticeEditorBoardTransition(2, 2, 2), {
    selectedBoardId: 2,
    shouldResetEditor: false,
  });
});

test("콘텐츠 쿼리 상태는 오류를 빈 상태보다 우선하고 재시도를 실행한다", () => {
  const contentPanelModule = loadContentPanelModule();
  let retries = 0;
  const errorState = contentPanelModule.AdminBoardContentQueryState({
    isLoading: false,
    isError: true,
    isEmpty: true,
    emptyMessage: "비어 있음",
    onRetry: () => {
      retries += 1;
    },
  });
  const errorElements = renderedElements(errorState);
  const retryButton = errorElements.find((element) => element.type === "Pressable");
  assert.ok(retryButton?.props?.onPress);
  retryButton.props.onPress();
  assert.equal(retries, 1);
  assert.equal(JSON.stringify(errorState).includes("불러오지 못했습니다"), true);
  assert.equal(JSON.stringify(errorState).includes("비어 있음"), false);

  const loadingState = contentPanelModule.AdminBoardContentQueryState({
    isLoading: true,
    isError: false,
    isEmpty: true,
    emptyMessage: "비어 있음",
    onRetry: () => undefined,
  });
  assert.equal(renderedElements(loadingState).some((element) => element.type === "ActivityIndicator"), true);

  const emptyState = contentPanelModule.AdminBoardContentQueryState({
    isLoading: false,
    isError: false,
    isEmpty: true,
    emptyMessage: "비어 있음",
    onRetry: () => undefined,
  });
  assert.equal(JSON.stringify(emptyState).includes("비어 있음"), true);
});

test("공지 건의 상조회는 통합 콘텐츠 renderer map으로 연결한다", () => {
  assert.match(adminSource, /"notice": renderNoticeContent/);
  assert.match(adminSource, /"suggestion": renderSuggestionContent/);
  assert.match(adminSource, /"mutual-aid": renderMutualAidContent/);
  assert.doesNotMatch(adminSource, /\.dedicatedSection/);
  assert.match(contentPanelSource, /renderers\[capability\.kind\]/);
});

test("비게시글 게시판도 통합 콘텐츠 패널에서 관리한다", () => {
  assert.match(adminSource, /"organization-intro": renderOrganizationIntroContent/);
  assert.match(adminSource, /calendar: renderCalendarContent/);
  assert.match(adminSource, /faq: renderFaqContent/);
  assert.match(adminSource, /"external-link": renderExternalLinkContent/);
  assert.match(adminSource, /guide: renderGuideContent/);
});

test("원우회 소개는 선택 게시판 slug로 기존 전용 편집기를 고른다", () => {
  assert.match(adminSource, /case "gsa-executives":\s*return renderExecutivesContent\(\)/);
  assert.match(adminSource, /case "gsa-cohort-leaders":\s*return renderCohortLeadersContent\(\)/);
  assert.match(adminSource, /case "gsa-past-councils":\s*return renderPastCouncilsContent\(\)/);
  assert.match(adminSource, /default:\s*return <UnsupportedBoardContent board=\{selectedManagedBoard\}/);
});

test("일정과 FAQ는 통합 콘텐츠와 기존 메뉴에서만 조회하고 오류를 재시도할 수 있다", () => {
  assert.match(adminSource, /enabled: isAdmin && \(Boolean\(editEventId\) \|\| section === "events" \|\| \(isManagedContentActive && managedContentKind === "calendar"\)\)/);
  assert.match(adminSource, /enabled: isAdmin && \(section === "faqs" \|\| \(isManagedContentActive && managedContentKind === "faq"\)\)/);
  assert.match(adminSource, /eventsQuery\.refetch/);
  assert.match(adminSource, /faqsQuery\.refetch/);
});

test("외부 링크 저장은 대상 게시판과 draft를 보호하고 두 게시판 캐시를 갱신한다", () => {
  assert.match(adminSource, /externalLinkMetadata/);
  assert.match(adminSource, /validateExternalHttpUrl/);
  assert.match(adminSource, /externalLinkBoardIdRef/);
  assert.match(adminSource, /const targetBoardId = selectedManagedBoard\.id/);
  assert.match(adminSource, /const targetDraft = externalLinkDraft\.trim\(\)/);
  assert.match(adminSource, /boardApi\.updateAdminBoard\(targetBoardId, \{[\s\S]*?metadata: externalLinkMetadata\(selectedManagedBoard, targetDraft\)/);
  assert.match(adminSource, /invalidateQueries\(\{ queryKey: \["admin-boards"\] \}\)/);
  assert.match(adminSource, /invalidateQueries\(\{ queryKey: \["boards"\] \}\)/);
  assert.match(adminSource, /외부 링크를 저장하지 못했습니다/);
});

test("외부 링크 draft 전이는 같은 게시판 refresh를 무시하고 선택과 저장 성공만 동기화한다", () => {
  const transitions = loadExternalLinkDraftTransitions();
  const initial = { boardId: null, draft: "" };
  const accounting = {
    ...board(40, "gsa"),
    metadata: { notion_url: "https://notion.example.com/accounting", keep: "yes" },
  };
  const selected = transitions.externalLinkBoardTransition(initial, accounting) as { boardId: number | null; draft: string };
  assert.deepEqual(selected, { boardId: 40, draft: "https://notion.example.com/accounting" });

  const dirty = { ...selected, draft: "https://draft.example.com/unsaved" };
  const refreshed = transitions.externalLinkBoardTransition(
    dirty,
    { ...accounting, metadata: { external_url: "https://server.example.com/refreshed" } },
  );
  assert.equal(refreshed, dirty);

  const switched = transitions.externalLinkBoardTransition(
    dirty,
    { ...board(41, "gsa"), metadata: { external_url: "https://other.example.com" } },
  );
  assert.deepEqual(switched, { boardId: 41, draft: "https://other.example.com" });
  assert.deepEqual(
    transitions.externalLinkSaveTransition(switched, 41, "  https://other.example.com/saved  "),
    { boardId: 41, draft: "https://other.example.com/saved" },
  );
  assert.equal(
    transitions.externalLinkSaveTransition(dirty, 41, "https://stale.example.com"),
    dirty,
  );
});

test("외부 링크 저장 중 탐색은 동기적으로 거절하고 허용된 선택은 즉시 응답 가드를 바꾼다", () => {
  const transitions = loadExternalLinkDraftTransitions();
  assert.deepEqual(transitions.externalLinkNavigationTransition(40, 41, true), {
    accepted: false,
    boardId: 40,
  });
  assert.deepEqual(transitions.externalLinkNavigationTransition(40, 41, false), {
    accepted: true,
    boardId: 41,
  });
  const boardBAfterAcceptedSelection = { boardId: 41, draft: "https://b.example.com/dirty" };
  assert.equal(
    transitions.externalLinkSaveTransition(boardBAfterAcceptedSelection, 40, "https://a.example.com/saved"),
    boardBAfterAcceptedSelection,
  );

  assert.match(adminSource, /boardSettingsSavingRef\.current \|\| externalLinkSavingRef\.current/);
  assert.match(adminSource, /disabled=\{boardSettingsSaving \|\| externalLinkSaving\}/);
  assert.match(adminSource, /syncExternalLinkNavigationBoardId\(transition\.boardId\)/);
  assert.match(adminSource, /syncExternalLinkNavigationBoardId\(item\.board_id\)/);
});

test("가이드는 읽기 전용 안내만 표시하고 metadata 저장값을 만들지 않는다", () => {
  assert.match(adminSource, /이 가이드는 별도 콘텐츠 저장 형식을 사용하지 않습니다\. 이름, 설명, 노출과 권한은 운영 설정에서 관리할 수 있습니다\./);
  const guideRenderer = adminSource.slice(
    adminSource.indexOf("const renderGuideContent"),
    adminSource.indexOf("const managedContentRenderers"),
  );
  assert.doesNotMatch(guideRenderer, /updateAdminBoard|metadata:/);
});

test("숨겨진 게시판 콘텐츠 쿼리는 실행하지 않고 대시보드 집계는 유지한다", () => {
  assert.match(adminSource, /const isManagedContentActive = section === "boardManagement" && boardManagementTab === "content"/);
  assert.match(adminSource, /enabled: isAdmin && \(section === "dashboard" \|\| showsStandardPosts\)/);
  assert.match(adminSource, /section === "dashboard" \? undefined : appliedPostSearch\.trim\(\) \|\| undefined/);
  assert.match(adminSource, /section === "dashboard" \? undefined : managedStandardPostsBoardId/);
  assert.match(adminSource, /unifiedNoticePostsQuery[\s\S]*?postApi\.getAdminPosts/);
  assert.match(adminSource, /noticeQueryPolicy\.noticeSource === "admin"/);
});

test("활동내역 공지 편집은 통합 게시판 선택을 실제 공지 게시판으로 전환한다", () => {
  assert.match(adminSource, /board_type: "notice"/);
  assert.match(adminSource, /show_in_council_activity === true/);
  assert.match(adminSource, /setSelectedNoticeBoardId\(item\.board_id\)/);
  assert.match(adminSource, /setBoardManagementScope\("notices"\)/);
  assert.match(adminSource, /setBoardManagementBoardId\(item\.board_id\)/);
  assert.match(adminSource, /setBoardManagementTab\("content"\)/);
});
