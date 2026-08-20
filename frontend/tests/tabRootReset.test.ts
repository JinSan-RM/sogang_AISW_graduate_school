import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  INITIAL_TAB_ROOT_RESET_REVISIONS,
  resetRevisionForTab,
  shouldRequestTabRootReset,
  type TabRootName,
} from "../stores/tabRootResetStore";

const layoutSource = readFileSync("app/(tabs)/_layout.tsx", "utf8");
const noticesSource = readFileSync("app/(tabs)/notices.tsx", "utf8");
const communitySource = readFileSync("app/(tabs)/community.tsx", "utf8");
const participationSource = readFileSync("app/(tabs)/participation.tsx", "utf8");

function tabScreenBlock(tabName: TabRootName) {
  const nameIndex = layoutSource.indexOf(`name="${tabName}"`);
  assert.notEqual(nameIndex, -1, `${tabName} Tabs.Screen이 있어야 합니다.`);

  const blockStart = layoutSource.lastIndexOf("<Tabs.Screen", nameIndex);
  const nextBlockStart = layoutSource.indexOf("<Tabs.Screen", nameIndex + 1);
  return layoutSource.slice(blockStart, nextBlockStart === -1 ? undefined : nextBlockStart);
}

test("하단 탭 초기화 revision의 기본값은 세 대상 탭 모두 0이다", () => {
  assert.deepEqual(INITIAL_TAB_ROOT_RESET_REVISIONS, {
    notices: 0,
    community: 0,
    participation: 0,
  });
});

test("비활성 탭으로 재진입할 때만 초기화를 요청한다", () => {
  assert.equal(shouldRequestTabRootReset(false), true);
  assert.equal(shouldRequestTabRootReset(true), false);
});

test("선택한 탭 revision만 증가시키고 다른 탭 및 기존 객체는 보존한다", () => {
  const current = { notices: 3, community: 5, participation: 8 };

  for (const tabName of ["notices", "community", "participation"] satisfies TabRootName[]) {
    const next = resetRevisionForTab(current, tabName);
    const expected = {
      ...current,
      [tabName]: current[tabName] + 1,
    };

    assert.deepEqual(next, expected);
    assert.notStrictEqual(next, current);
    assert.deepEqual(current, { notices: 3, community: 5, participation: 8 });
  }
});

test("공지사항·커뮤니티·참여활동 탭은 tabPress에서 자신의 초기화를 요청한다", () => {
  for (const tabName of ["notices", "community", "participation"] satisfies TabRootName[]) {
    const block = tabScreenBlock(tabName);
    assert.match(block, /listeners\s*=/, `${tabName}에 탭 이벤트 listener가 필요합니다.`);
    assert.match(block, /\btabPress\s*:/, `${tabName}은 tabPress만 처리해야 합니다.`);
    assert.match(block, /navigation\.isFocused\(\)/, `${tabName}의 활성 상태를 확인해야 합니다.`);
    assert.match(block, new RegExp(`requestTabRootReset\\(["']${tabName}["']\\)`));
  }

  assert.match(layoutSource, /shouldRequestTabRootReset/);
});

test("focus나 blur 이벤트로는 탭 루트를 초기화하지 않는다", () => {
  assert.doesNotMatch(layoutSource, /\b(?:focus|blur)\s*:/);

  for (const source of [noticesSource, communitySource, participationSource]) {
    assert.doesNotMatch(source, /useFocusEffect/);
  }
});

test("세 탭 화면은 자신의 reset revision을 key로 소비해 로컬 상태와 스크롤을 재생성한다", () => {
  for (const [screenName, source] of [
    ["notices", noticesSource],
    ["community", communitySource],
    ["participation", participationSource],
  ] as const) {
    assert.match(source, /useTabRootResetStore/, `${screenName} 화면이 reset revision을 구독해야 합니다.`);
    assert.match(source, /key=\{resetRevision\}/, `${screenName} 화면이 reset revision을 key로 사용해야 합니다.`);
  }
});
