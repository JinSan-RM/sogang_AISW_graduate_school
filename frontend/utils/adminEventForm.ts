export function adminEventFormRouteTransition(input: {
  previousEditEventId: number | null;
  nextEditEventId: number | null;
}) {
  return {
    shouldResetForm: input.previousEditEventId !== null && input.nextEditEventId === null,
  };
}
