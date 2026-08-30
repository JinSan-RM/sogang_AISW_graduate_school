import assert from "node:assert/strict";
import test from "node:test";

import { eventCategoryValueForSubmit } from "../utils/eventCategoryPresentation";
import { adminEventFormRouteTransition } from "../utils/adminEventForm";

test("레거시 일정 편집에서 새 일정 폼으로 이동하면 원본 category 없이 canonical category를 저장한다", () => {
  const transition = adminEventFormRouteTransition({
    previousEditEventId: 42,
    nextEditEventId: null,
  });

  assert.deepEqual(transition, {
    shouldResetForm: true,
    originalCategory: null,
    explicitlySelected: false,
  });
  assert.equal(
    eventCategoryValueForSubmit({
      originalCategory: transition.originalCategory,
      selectedCategory: "event",
      explicitlySelected: transition.explicitlySelected,
    }),
    "event",
  );
});
