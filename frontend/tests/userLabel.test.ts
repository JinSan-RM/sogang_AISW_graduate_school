import assert from "node:assert/strict";
import test from "node:test";

import { formatCohortName } from "../utils/userLabel";

test("작성자 이름에 동일 기수 접두사가 있으면 한 번만 표시한다", () => {
  assert.equal(formatCohortName("70기", "70기_이혜진"), "70기 이혜진");
  assert.equal(formatCohortName("70", "70기 - 이혜진"), "70기 이혜진");
});

test("기수 접두사가 중복되지 않으면 기존 이름을 보존한다", () => {
  assert.equal(formatCohortName("70기", "이혜진"), "70기 이혜진");
  assert.equal(formatCohortName(null, "이혜진"), "이혜진");
});
