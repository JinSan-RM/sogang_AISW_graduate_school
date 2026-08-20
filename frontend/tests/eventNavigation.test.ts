import assert from "node:assert/strict";
import test from "node:test";

import * as appRoutes from "../utils/appRoutes";

type EventDayBackDecision =
  | { action: "back" }
  | { action: "navigate"; route: "/(tabs)/home" }
  | { action: "replace"; route: "/(tabs)/home" };

const eventDayRoute = Reflect.get(appRoutes, "eventDayRoute") as
  | ((dateKey: string, returnTo?: unknown) => string)
  | undefined;
const eventDayBackDecision = Reflect.get(appRoutes, "eventDayBackDecision") as
  | ((returnTo: unknown, canGoBack: boolean) => EventDayBackDecision)
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
