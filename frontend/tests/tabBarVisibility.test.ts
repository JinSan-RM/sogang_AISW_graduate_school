import assert from "node:assert/strict";
import test from "node:test";

import { shouldHideTabBar } from "../utils/tabBarVisibility";

test("회원 탈퇴 화면만 하단 탭을 숨긴다", () => {
  assert.equal(shouldHideTabBar("/settings/account-deletion"), true);
  assert.equal(shouldHideTabBar("/settings/account-deletion/"), true);
  assert.equal(shouldHideTabBar("/(tabs)/settings/account-deletion"), true);
  assert.equal(shouldHideTabBar("/settings/account"), false);
  assert.equal(shouldHideTabBar("/settings"), false);
  assert.equal(shouldHideTabBar("/home"), false);
});
