import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_CATEGORY_OPTIONS,
  eventCategoryLabel,
  eventCategoryTone,
  eventCategoryValueForSubmit,
  eventDisplayCategory,
} from "../utils/eventCategoryPresentation";

test("일정은 PR 원본의 3종 카테고리만 사용한다", () => {
  assert.equal(eventDisplayCategory("academic"), "academic");
  assert.equal(eventDisplayCategory("event"), "event");
  assert.equal(eventDisplayCategory("other"), "other");
  assert.equal(eventDisplayCategory("exam"), "other");
  assert.equal(eventDisplayCategory("council"), "other");
  assert.equal(eventDisplayCategory("external"), "other");
  assert.equal(eventDisplayCategory("legacy-unknown"), "other");
  assert.equal(eventDisplayCategory(undefined), "other");
  assert.deepEqual(EVENT_CATEGORY_OPTIONS, [
    { value: "academic", label: "학사일정" },
    { value: "event", label: "행사일정" },
    { value: "other", label: "기타일정" },
  ]);
  assert.equal(eventCategoryLabel("academic"), "학사일정");
  assert.equal(eventCategoryLabel("event"), "행사일정");
  assert.equal(eventCategoryLabel("legacy-unknown"), "기타일정");
});

test("날짜별과 상세 화면은 PR 3종 tone만 사용한다", () => {
  assert.deepEqual(eventCategoryTone("academic", "day"), {
    backgroundColor: "#E6F1FB",
    color: "#0C447C",
  });
  assert.deepEqual(eventCategoryTone("event", "day"), {
    backgroundColor: "#FBEAF0",
    color: "#993556",
  });
  assert.deepEqual(eventCategoryTone("event", "detail"), {
    backgroundColor: "#FBEAF0",
    color: "#993556",
  });
  assert.deepEqual(eventCategoryTone("anything", "detail"), {
    backgroundColor: "#EDE8F6",
    color: "#4A2B7A",
  });
  assert.deepEqual(eventCategoryTone("exam", "day"), {
    backgroundColor: "#EDE8F6",
    color: "#4A2B7A",
  });
});

test("일정 저장은 선택된 PR 3종 값을 그대로 사용한다", () => {
  assert.equal(eventCategoryValueForSubmit("academic"), "academic");
  assert.equal(eventCategoryValueForSubmit("event"), "event");
  assert.equal(eventCategoryValueForSubmit("other"), "other");
});
