import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import { noticeRefreshControlRefreshing } from "../utils/pullToRefresh";

const source = ts.createSourceFile("notices.tsx", readFileSync("app/(tabs)/notices.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let expression: string | undefined;
function visit(node: ts.Node) {
  if (ts.isJsxAttribute(node) && node.name.getText(source) === "refreshing" && node.initializer && ts.isJsxExpression(node.initializer)) {
    expression = node.initializer.expression?.getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(expression);

test("새 공지 필터의 첫 로딩은 게시판 refetch와 겹쳐도 pull 로딩을 추가하지 않는다", () => {
  const refreshing = runInNewContext(expression!, {
    boardsLoading: false,
    boardsRefetching: true,
    postsQuery: { isLoading: true, isRefreshingFirstPage: false },
    noticeRefreshControlRefreshing,
  });
  assert.equal(refreshing, false);
});

test("이미 표시된 공지의 새로고침은 pull 로딩을 유지한다", () => {
  const refreshing = runInNewContext(expression!, {
    boardsLoading: false,
    boardsRefetching: false,
    postsQuery: { isLoading: false, isRefreshingFirstPage: true },
    noticeRefreshControlRefreshing,
  });
  assert.equal(refreshing, true);
});
