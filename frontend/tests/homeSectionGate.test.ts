import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";

import HomeSectionGate from "../components/HomeSectionGate";

test("닫힌 홈 섹션은 자식 UI를 렌더링하지 않는다", () => {
  const popularHeading = createElement("h2", null, "🔥 인기 게시글");
  const rendered = HomeSectionGate({ visible: false, children: popularHeading });

  assert.equal(rendered, null);
});
