import assert from "node:assert/strict";
import test from "node:test";

import { participationApplicationUrl } from "../utils/participationGuide";

test("참여 신청 버튼은 metadata의 관리자 URL만 사용한다", () => {
  assert.equal(
    participationApplicationUrl({ application_url: " https://example.com/join " }),
    "https://example.com/join",
  );
  assert.equal(participationApplicationUrl({}), undefined);
  assert.equal(participationApplicationUrl(undefined), undefined);
});
