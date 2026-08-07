export type CommentKeyAction = "ignore" | "newline" | "submit";

export function commentSubmissionValue({
  text,
  isPending = false,
  isLocked = false,
}: {
  text: string;
  isPending?: boolean;
  isLocked?: boolean;
}): string | null {
  if (isPending || isLocked) return null;
  const trimmed = text.trim();
  return trimmed || null;
}

export function commentKeyAction({
  key,
  shiftKey = false,
  isComposing = false,
  keyCode,
}: {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}): CommentKeyAction {
  if (key !== "Enter") return "ignore";
  if (isComposing || keyCode === 229) return "ignore";
  return shiftKey ? "newline" : "submit";
}
