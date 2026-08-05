import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { MY_PAGE_ROUTE } from "../utils/appRoutes";

const activitySource = readFileSync("app/settings/activity.tsx", "utf8");

test("마이페이지 활동 화면의 상단 뒤로가기는 항상 마이페이지로 복귀한다", () => {
  assert.equal(MY_PAGE_ROUTE, "/(tabs)/settings");
  assert.match(activitySource, /onPress=\{goBackToMyPage\}/);
  assert.match(activitySource, /router\.replace\(MY_PAGE_ROUTE as never\)/);
  assert.doesNotMatch(activitySource, /router\.back\(\)/);
});

test("Android 하드웨어 뒤로가기도 마이페이지 복귀를 사용한다", () => {
  assert.match(activitySource, /BackHandler\.addEventListener\("hardwareBackPress"/);
  assert.match(activitySource, /goBackToMyPage\(\);\s*return true;/);
});
