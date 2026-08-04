import assert from "node:assert/strict";
import test from "node:test";

import { hasReachedPrivacyPolicyEnd, PRIVACY_POLICY_SECTIONS } from "../utils/privacyPolicy";


test("개인정보 전문은 법정 고지 항목을 공통 콘텐츠로 제공한다", () => {
  assert.deepEqual(
    PRIVACY_POLICY_SECTIONS.map((section) => section.title),
    [
      "제 1조 (수집 항목)",
      "제 2조 (수집 목적)",
      "제 3조 (보유 및 이용기간)",
      "제 4조 (동의 거부 권리)",
    ],
  );
});


test("개인정보 전문은 마지막 영역에 도달해야 확인 완료가 된다", () => {
  assert.equal(
    hasReachedPrivacyPolicyEnd({ contentHeight: 1000, viewportHeight: 600, offsetY: 383 }),
    false,
  );
  assert.equal(
    hasReachedPrivacyPolicyEnd({ contentHeight: 1000, viewportHeight: 600, offsetY: 384 }),
    true,
  );
  assert.equal(
    hasReachedPrivacyPolicyEnd({ contentHeight: 500, viewportHeight: 600, offsetY: 0 }),
    true,
  );
  assert.equal(
    hasReachedPrivacyPolicyEnd({ contentHeight: 0, viewportHeight: 600, offsetY: 0 }),
    false,
  );
});
