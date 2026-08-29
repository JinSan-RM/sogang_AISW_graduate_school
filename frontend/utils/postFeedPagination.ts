import type { InfiniteData } from "@tanstack/react-query";

import type { ApiSuccess, PostListItem } from "../types";

export type PostPage = ApiSuccess<PostListItem[]>;

export function nextPostPage(lastPage: PostPage): number | undefined {
  if (!Array.isArray(lastPage.data) || lastPage.data.length === 0) {
    return undefined;
  }

  const pagination = lastPage.pagination;
  if (
    !pagination ||
    !Number.isInteger(pagination.page) ||
    pagination.page < 1 ||
    !Number.isInteger(pagination.total_pages) ||
    pagination.total_pages < 1 ||
    pagination.page >= pagination.total_pages
  ) {
    return undefined;
  }

  return pagination.page + 1;
}

export function uniquePostItems(pages: readonly PostPage[]): PostListItem[] {
  const seen = new Set<number>();
  const items: PostListItem[] = [];

  for (const page of pages) {
    if (!Array.isArray(page.data)) continue;

    for (const item of page.data) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }

  return items;
}

export function firstPostPageData(firstPage: PostPage): InfiniteData<PostPage, number> {
  return {
    pages: [firstPage],
    pageParams: [1],
  };
}

export async function refreshFirstPostPage(
  load: () => Promise<PostPage>,
  commit: (data: InfiniteData<PostPage, number>) => void,
): Promise<void> {
  const firstPage = await load();
  commit(firstPostPageData(firstPage));
}
