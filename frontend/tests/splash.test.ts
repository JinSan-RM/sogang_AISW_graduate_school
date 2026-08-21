import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowSplash } from "../utils/splash";

test("앱 준비가 끝나도 최소 표시 시간이 지나기 전에는 스플래시를 유지한다", () => {
  assert.equal(
    shouldShowSplash({
      hasHydrated: true,
      fontsLoaded: true,
      minimumDurationElapsed: false,
    }),
    true,
  );
});

test("최소 표시 시간과 앱 준비가 모두 끝나면 스플래시를 닫는다", () => {
  assert.equal(
    shouldShowSplash({
      hasHydrated: true,
      fontsLoaded: true,
      minimumDurationElapsed: true,
    }),
    false,
  );
});

test("최소 표시 시간이 지나도 세션이나 폰트가 준비되지 않으면 스플래시를 유지한다", () => {
  assert.equal(
    shouldShowSplash({
      hasHydrated: false,
      fontsLoaded: true,
      minimumDurationElapsed: true,
    }),
    true,
  );
  assert.equal(
    shouldShowSplash({
      hasHydrated: true,
      fontsLoaded: false,
      minimumDurationElapsed: true,
    }),
    true,
  );
});
