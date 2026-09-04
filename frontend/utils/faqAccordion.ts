export type FAQAccordionState = ReadonlySet<number>;

export type FAQRowPresentation = {
  expanded: boolean;
  chevron: "chevron-down" | "chevron-up";
  showAnswer: boolean;
};

export function createFaqAccordionState(): Set<number> {
  return new Set<number>();
}

export function toggleFaqExpansion(current: FAQAccordionState, faqId: number): Set<number> {
  const next = new Set(current);
  if (next.has(faqId)) {
    next.delete(faqId);
  } else {
    next.add(faqId);
  }
  return next;
}

export function faqRowPresentation(state: FAQAccordionState, faqId: number): FAQRowPresentation {
  const expanded = state.has(faqId);
  return {
    expanded,
    chevron: expanded ? "chevron-up" : "chevron-down",
    showAnswer: expanded,
  };
}
