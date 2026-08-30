import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { eventCategoryValueForSubmit } from "../utils/eventCategoryPresentation";
import { adminEventFormRouteTransition } from "../utils/adminEventForm";

const adminSource = readFileSync("app/admin/index.tsx", "utf8");

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

test("관리자 화면은 편집에서 새 일정 폼으로 바뀔 때 하나의 guarded transition에서 editor 상태를 비운다", () => {
  const transitionEffect = adminSource.match(
    /useEffect\(\(\) => \{\r?\n    const transition = adminEventFormRouteTransition\([\s\S]*?\r?\n  \}, \[editEventId, reset\]\);/,
  )?.[0];

  assert.ok(transitionEffect, "edit-to-new route transition effect must exist");
  assert.match(transitionEffect, /previousEditEventId:\s*eventFormEditIdRef\.current/);
  assert.match(transitionEffect, /nextEditEventId:\s*editEventId/);
  assert.match(transitionEffect, /if \(!transition\.shouldResetForm\) return;/);
  assert.match(transitionEffect, /eventOriginalCategoryRef\.current = transition\.originalCategory;/);
  assert.match(transitionEffect, /eventCategoryExplicitlySelectedRef\.current = transition\.explicitlySelected;/);
  assert.match(transitionEffect, /reset\(emptyEvent\);/);
});
