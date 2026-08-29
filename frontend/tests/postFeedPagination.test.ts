import assert from "node:assert/strict";
import test from "node:test";

import type { ApiSuccess, PostListItem } from "../types";
import {
  firstPostPageData,
  nextPostPage,
  refreshFirstPostPage,
  uniquePostItems,
} from "../utils/postFeedPagination";

function post(id: number): PostListItem {
  return {
    id,
    board_id: 1,
    title: `게시글 ${id}`,
    content_preview: "내용",
    author_id: 1,
    author_nickname: "작성자",
    is_anonymous: false,
    is_pinned: false,
    is_notice: false,
    status: "published",
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    created_at: "2026-08-29T00:00:00Z",
  };
}

function page(
  currentPage: number,
  totalPages: number,
  data: PostListItem[] = [],
): ApiSuccess<PostListItem[]> {
  return {
    status: "success",
    data,
    pagination: {
      page: currentPage,
      size: 20,
      total: totalPages * 20,
      total_pages: totalPages,
    },
  };
}

test("다음 페이지는 서버 페이지가 진행하고 데이터가 있을 때만 반환한다", () => {
  assert.equal(nextPostPage(page(1, 3, [post(1)])), 2);
  assert.equal(nextPostPage(page(1, 3, [])), undefined);
  assert.equal(nextPostPage(page(3, 3, [post(3)])), undefined);
});

test("잘못된 페이지 메타데이터는 다음 페이지를 만들지 않는다", () => {
  assert.equal(nextPostPage({ status: "success", data: [post(1)] }), undefined);
  assert.equal(nextPostPage(page(0, 3, [post(1)])), undefined);
  assert.equal(nextPostPage(page(1.5, 3, [post(1)])), undefined);
  assert.equal(nextPostPage(page(1, 0, [post(1)])), undefined);
  assert.equal(nextPostPage(page(4, 3, [post(1)])), undefined);
});

test("페이지가 비어 있으면 페이지 메타데이터와 무관하게 다음 페이지를 만들지 않는다", () => {
  assert.equal(nextPostPage(page(1, 3)), undefined);
  assert.equal(nextPostPage(page(2, 3, [])), undefined);
});

test("여러 페이지의 게시글은 첫 등장과 페이지 순서를 보존하며 중복을 제거한다", () => {
  const pages = [
    page(1, 3, [post(1), post(2)]),
    page(2, 3, [post(2), post(3)]),
    page(3, 3, [post(1), post(4)]),
  ];

  assert.deepEqual(uniquePostItems(pages).map((item) => item.id), [1, 2, 3, 4]);
});

test("첫 페이지 데이터는 무한 쿼리 페이지와 페이지 파라미터를 함께 초기화한다", () => {
  const firstPage = page(1, 3, [post(1)]);

  assert.deepEqual(firstPostPageData(firstPage), {
    pages: [firstPage],
    pageParams: [1],
  });
});

test("첫 페이지 새로고침 성공은 새 페이지를 한 번만 커밋한다", async () => {
  const firstPage = page(1, 1, [post(2)]);
  const committed: unknown[] = [];

  await refreshFirstPostPage(async () => firstPage, (data) => {
    committed.push(data);
  });

  assert.deepEqual(committed, [firstPostPageData(firstPage)]);
});

test("첫 페이지 새로고침 실패는 기존 캐시를 교체하지 않는다", async () => {
  let committed = false;

  await assert.rejects(
    () =>
      refreshFirstPostPage(
        async () => {
          throw new Error("offline");
        },
        () => {
          committed = true;
        },
      ),
    { message: "offline" },
  );
  assert.equal(committed, false);
});
