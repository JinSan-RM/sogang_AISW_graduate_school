import assert from "node:assert/strict";
import test from "node:test";

import { hasReachedPrivacyPolicyEnd, PRIVACY_POLICY_SECTIONS } from "../utils/privacyPolicy";


test("전문은 서비스 이용약관과 개인정보 처리방침의 필수 항목을 제공한다", () => {
  const titles = PRIVACY_POLICY_SECTIONS.map((section) => section.title);

  for (const requiredTitle of [
    "서비스 이용약관",
    "개인정보 처리방침",
    "제1조 (개인정보의 처리 목적)",
    "제2조 (개인정보의 처리 및 보유 기간)",
    "제6조 (처리하는 개인정보의 항목)",
    "제13조 (개인정보 처리방침의 변경)",
  ]) {
    assert.ok(titles.includes(requiredTitle), `필수 항목 누락: ${requiredTitle}`);
  }
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
