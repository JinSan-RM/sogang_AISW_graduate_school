import assert from "node:assert/strict";
import test from "node:test";

import { myPageReturnDecision, navigateBackToMyPageDrawer } from "../utils/myPageNavigation";

test("설정 뒤로가기는 이전 탭을 우선하고 직접 진입은 홈을 사용한다", () => {
  assert.deepEqual(myPageReturnDecision(true), { action: "back" });
  assert.deepEqual(myPageReturnDecision(false), { action: "replace", route: "/(tabs)/home" });
});

test("마이페이지 복귀는 이전 화면 이동 뒤 드로어를 다시 연다", () => {
  const calls: string[] = [];
  navigateBackToMyPageDrawer(
    {
      canGoBack: () => true,
      back: () => calls.push("back"),
      replace: () => calls.push("replace"),
    },
    () => calls.push("open"),
    (callback) => {
      calls.push("schedule");
      callback();
    },
  );
  assert.deepEqual(calls, ["back", "schedule", "open"]);
});

test("직접 진입 복귀는 홈 교체 뒤 드로어를 다시 연다", () => {
  const calls: string[] = [];
  navigateBackToMyPageDrawer(
    {
      canGoBack: () => false,
      back: () => calls.push("back"),
      replace: (route) => calls.push(`replace:${route}`),
    },
    () => calls.push("open"),
    (callback) => callback(),
  );
  assert.deepEqual(calls, ["replace:/(tabs)/home", "open"]);
});
