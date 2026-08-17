import assert from "node:assert/strict";
import test from "node:test";

import {
  MY_PAGE_DRAWER_SETTINGS_ROUTES,
  handleMyPageHardwareBack,
  myPageOriginRoute,
  myPageSettingsBackHandler,
  navigateBackToMyPageDrawer,
} from "../utils/myPageNavigation";

test("마이페이지 원본 탭은 Expo 경로 표기를 정규화하고 설정·임의 경로를 거부한다", () => {
  assert.equal(myPageOriginRoute("/home"), "/(tabs)/home");
  assert.equal(myPageOriginRoute("/(tabs)/participation/"), "/(tabs)/participation");
  assert.equal(myPageOriginRoute("/community"), "/(tabs)/community");
  assert.equal(myPageOriginRoute("/settings/profile"), null);
  assert.equal(myPageOriginRoute("/board/17"), null);
});

test("초기화된 설정 스택과 무관한 뒤로가기 기록이 있어도 Home 원본 탭을 명시적으로 재활성화한다", () => {
  const calls: string[] = [];
  navigateBackToMyPageDrawer(
    "/(tabs)/home",
    {
      canGoBack: () => true,
      back: () => calls.push("back"),
      navigate: (route) => calls.push(`navigate:${route}`),
    },
    () => calls.push("open"),
    (callback) => {
      calls.push("schedule");
      callback();
    },
  );
  assert.deepEqual(calls, ["navigate:/(tabs)/home", "schedule", "open"]);
});

test("Participation 원본 탭은 설정 기록을 pop하지 않고 기존 탭 인스턴스를 재활성화한다", () => {
  const calls: string[] = [];
  navigateBackToMyPageDrawer(
    "/(tabs)/participation",
    {
      canGoBack: () => true,
      back: () => calls.push("back"),
      navigate: (route) => calls.push(`navigate:${route}`),
    },
    () => calls.push("open"),
    (callback) => callback(),
  );
  assert.deepEqual(calls, ["navigate:/(tabs)/participation", "open"]);
});

test("유효한 원본 탭이 없는 직접 진입만 Home으로 복귀한다", () => {
  const calls: string[] = [];
  navigateBackToMyPageDrawer(
    "/settings/profile",
    { navigate: (route) => calls.push(`navigate:${route}`) },
    () => calls.push("open"),
    (callback) => callback(),
  );
  assert.deepEqual(calls, ["navigate:/(tabs)/home", "open"]);
});

test("프로필·알림·계정 화면 계약은 모두 같은 마이페이지 복귀 동작을 실행한다", () => {
  assert.deepEqual(MY_PAGE_DRAWER_SETTINGS_ROUTES, [
    "/settings/profile",
    "/settings/notifications",
    "/settings/account",
  ]);

  const calls: string[] = [];
  for (const route of MY_PAGE_DRAWER_SETTINGS_ROUTES) {
    myPageSettingsBackHandler(route, () => calls.push(route))();
  }
  assert.deepEqual(calls, MY_PAGE_DRAWER_SETTINGS_ROUTES);
});

test("Android hardware Back은 헤더와 같은 핸들러를 실행하고 이벤트를 소비한다", () => {
  let callCount = 0;
  const handled = handleMyPageHardwareBack(() => {
    callCount += 1;
  });

  assert.equal(handled, true);
  assert.equal(callCount, 1);
});
