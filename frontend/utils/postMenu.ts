export type PostAuthorBlockContext = {
  authorId?: number | null;
  isMine: boolean;
  canManagePost: boolean;
  isSuggestionRequest: boolean;
  isAdminOnlyBoard: boolean;
  boardSlug?: string;
};

const AUTHOR_BLOCK_EXCLUDED_BOARD_SLUGS = new Set([
  "comprehensive-exam",
  "graduation-thesis",
]);

export function shouldShowPostAuthorBlock(context: PostAuthorBlockContext): boolean {
  return context.authorId != null
    && !context.isMine
    && !context.canManagePost
    && !context.isSuggestionRequest
    && !context.isAdminOnlyBoard
    && !AUTHOR_BLOCK_EXCLUDED_BOARD_SLUGS.has(context.boardSlug ?? "");
}
