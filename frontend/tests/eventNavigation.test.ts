import assert from "node:assert/strict";
import test from "node:test";

import * as appRoutes from "../utils/appRoutes";

type EventDayBackDecision =
  | { action: "back" }
  | { action: "navigate"; route: "/(tabs)/home" }
  | { action: "replace"; route: "/(tabs)/home" };

type EventDetailBackDecision =
  | { action: "back" }
  | { action: "navigate"; route: "/(tabs)/notifications" }
  | { action: "replace"; route: "/events/calendar" };

const eventDayRoute = Reflect.get(appRoutes, "eventDayRoute") as
  | ((dateKey: string, returnTo?: unknown) => string)
  | undefined;
const eventDayBackDecision = Reflect.get(appRoutes, "eventDayBackDecision") as
  | ((returnTo: unknown, canGoBack: boolean) => EventDayBackDecision)
  | undefined;
const eventDetailRoute = Reflect.get(appRoutes, "eventDetailRoute") as
  | ((eventId: number, returnTo?: unknown) => string)
  | undefined;
const eventDetailBackDecision = Reflect.get(appRoutes, "eventDetailBackDecision") as
  | ((returnTo: unknown, canGoBack: boolean) => EventDetailBackDecision)
  | undefined;

test("홈 일정 날짜 링크만 홈 복귀 경로를 기록한다", () => {
  assert.equal(typeof eventDayRoute, "function");
  assert.equal(
    eventDayRoute?.("2026-08-20", appRoutes.HOME_TAB_ROUTE),
    "/events/day/2026-08-20?returnTo=%2F(tabs)%2Fhome",
  );
  assert.equal(eventDayRoute?.("2026-08-20"), "/events/day/2026-08-20");
  assert.equal(eventDayRoute?.("2026-08-20", "/(tabs)/events/calendar"), "/events/day/2026-08-20");
});

test("홈 일정 날짜 화면은 탐색 기록보다 홈 복귀를 우선한다", () => {
  assert.equal(typeof eventDayBackDecision, "function");
  assert.deepEqual(
    eventDayBackDecision?.(appRoutes.HOME_TAB_ROUTE, true),
    { action: "navigate", route: appRoutes.HOME_TAB_ROUTE },
  );
});

test("홈 외 진입과 직접 진입은 기존 뒤로가기 규칙을 유지한다", () => {
  assert.equal(typeof eventDayBackDecision, "function");
  assert.deepEqual(eventDayBackDecision?.(undefined, true), { action: "back" });
  assert.deepEqual(
    eventDayBackDecision?.("/(tabs)/events/calendar", true),
    { action: "back" },
  );
  assert.deepEqual(
    eventDayBackDecision?.(undefined, false),
    { action: "replace", route: appRoutes.HOME_TAB_ROUTE },
  );
});

test("서로 다른 일정 알림은 각각 알림 목록 복귀 경로를 기록한다", () => {
  assert.equal(typeof eventDetailRoute, "function");
  assert.equal(
    eventDetailRoute?.(301, "/(tabs)/notifications"),
    "/events/301?returnTo=%2F(tabs)%2Fnotifications",
  );
  assert.equal(
    eventDetailRoute?.(302, "/(tabs)/notifications"),
    "/events/302?returnTo=%2F(tabs)%2Fnotifications",
  );
});

test("알림에서 연 일정 상세는 탐색 기록보다 알림 목록 복귀를 우선한다", () => {
  assert.equal(typeof eventDetailBackDecision, "function");
  assert.deepEqual(
    eventDetailBackDecision?.("/(tabs)/notifications", true),
    { action: "navigate", route: "/(tabs)/notifications" },
  );
  assert.deepEqual(
    eventDetailBackDecision?.(["/(tabs)/notifications"], true),
    { action: "navigate", route: "/(tabs)/notifications" },
  );
});

test("홈·목록·캘린더·날짜·관리자 일정은 기존 상세 뒤로가기를 유지한다", () => {
  assert.equal(typeof eventDetailRoute, "function");
  assert.equal(typeof eventDetailBackDecision, "function");
  assert.equal(eventDetailRoute?.(301), "/events/301");
  assert.equal(eventDetailRoute?.(301, "/(tabs)/home"), "/events/301");
  assert.deepEqual(eventDetailBackDecision?.(undefined, true), { action: "back" });
  assert.deepEqual(eventDetailBackDecision?.("/(tabs)/home", true), { action: "back" });
  assert.deepEqual(
    eventDetailBackDecision?.(undefined, false),
    { action: "replace", route: "/events/calendar" },
  );
});

test("일정 상세는 외부 주소와 허용되지 않은 내부 returnTo를 무시한다", () => {
  assert.equal(typeof eventDetailRoute, "function");
  assert.equal(typeof eventDetailBackDecision, "function");
  assert.equal(eventDetailRoute?.(301, "https://example.com"), "/events/301");
  assert.equal(eventDetailRoute?.(301, "/board/7"), "/events/301");
  assert.deepEqual(eventDetailBackDecision?.("https://example.com", true), { action: "back" });
  assert.deepEqual(
    eventDetailBackDecision?.("/board/7", false),
    { action: "replace", route: "/events/calendar" },
  );
});
