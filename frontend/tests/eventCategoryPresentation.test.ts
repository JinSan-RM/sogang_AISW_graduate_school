import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_CATEGORY_OPTIONS,
  eventCategoryLabel,
  eventCategoryTone,
  eventCategoryValueForSubmit,
  eventDisplayCategory,
} from "../utils/eventCategoryPresentation";

test("기존 6종 일정은 화면의 3종으로만 표시된다", () => {
  assert.equal(eventDisplayCategory("academic"), "academic");
  assert.equal(eventDisplayCategory("exam"), "academic");
  assert.equal(eventDisplayCategory("event"), "event");
  assert.equal(eventDisplayCategory("council"), "event");
  assert.equal(eventDisplayCategory("external"), "event");
  assert.equal(eventDisplayCategory("other"), "other");
  assert.equal(eventDisplayCategory("legacy-unknown"), "other");
  assert.equal(eventDisplayCategory(undefined), "other");
  assert.deepEqual(EVENT_CATEGORY_OPTIONS, [
    { value: "academic", label: "학사일정" },
    { value: "event", label: "행사일정" },
    { value: "other", label: "기타일정" },
  ]);
  assert.equal(eventCategoryLabel("exam"), "학사일정");
  assert.equal(eventCategoryLabel("external"), "행사일정");
  assert.equal(eventCategoryLabel("legacy-unknown"), "기타일정");
});

test("날짜별과 상세 화면은 PR 커밋의 canonical tone을 사용한다", () => {
  assert.deepEqual(eventCategoryTone("exam", "day"), {
    backgroundColor: "#E6F1FB",
    color: "#0C447C",
  });
  assert.deepEqual(eventCategoryTone("council", "day"), {
    backgroundColor: "#FBEAF0",
    color: "#993556",
  });
  assert.deepEqual(eventCategoryTone("event", "detail"), {
    backgroundColor: "#FFF0F4",
    color: "#D65B7C",
  });
  assert.deepEqual(eventCategoryTone("anything", "detail"), {
    backgroundColor: "#EDE8F6",
    color: "#4A2B7A",
  });
});

test("레거시 일정은 칩을 누르기 전 원본값, 누른 뒤 canonical 값을 저장한다", () => {
  assert.equal(eventCategoryValueForSubmit({
    originalCategory: "exam",
    selectedCategory: "academic",
    explicitlySelected: false,
  }), "exam");
  assert.equal(eventCategoryValueForSubmit({
    originalCategory: "exam",
    selectedCategory: "academic",
    explicitlySelected: true,
  }), "academic");
  assert.equal(eventCategoryValueForSubmit({
    originalCategory: null,
    selectedCategory: "event",
    explicitlySelected: false,
  }), "event");
});
