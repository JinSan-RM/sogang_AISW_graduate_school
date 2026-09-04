import assert from "node:assert/strict";
import test from "node:test";

async function loadFaqAccordion() {
  try {
    return await import("../utils/faqAccordion");
  } catch {
    assert.fail("FAQ accordion behavior is not implemented");
  }
}

test("FAQ는 처음 열었을 때 모든 답변을 닫고 질문용 아래 화살표만 표시한다", async () => {
  const { createFaqAccordionState, faqRowPresentation } = await loadFaqAccordion();
  const state = createFaqAccordionState();

  assert.deepEqual(faqRowPresentation(state, 101), {
    expanded: false,
    chevron: "chevron-down",
    showAnswer: false,
  });
});

test("FAQ 질문을 누르면 해당 답변만 독립적으로 열고 다시 누르면 닫는다", async () => {
  const { createFaqAccordionState, faqRowPresentation, toggleFaqExpansion } = await loadFaqAccordion();
  const initial = createFaqAccordionState();
  const firstExpanded = toggleFaqExpansion(initial, 101);

  assert.deepEqual(faqRowPresentation(firstExpanded, 101), {
    expanded: true,
    chevron: "chevron-up",
    showAnswer: true,
  });
  assert.equal(faqRowPresentation(firstExpanded, 202).showAnswer, false);
  assert.equal(faqRowPresentation(initial, 101).showAnswer, false);

  const bothExpanded = toggleFaqExpansion(firstExpanded, 202);
  assert.equal(faqRowPresentation(bothExpanded, 101).showAnswer, true);
  assert.equal(faqRowPresentation(bothExpanded, 202).showAnswer, true);

  const firstCollapsed = toggleFaqExpansion(firstExpanded, 101);
  assert.equal(faqRowPresentation(firstCollapsed, 101).showAnswer, false);
});
