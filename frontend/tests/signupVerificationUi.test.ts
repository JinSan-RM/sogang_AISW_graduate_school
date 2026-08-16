import assert from "node:assert/strict";
import test from "node:test";

import {
  resendAvailableAt,
  resendCountdownLabel,
  signupProgressDotIndex,
} from "../utils/signupVerificationUi";


test("인증코드 화면은 첫 번째 진행 점을 활성화한다", () => {
  assert.equal(signupProgressDotIndex(1), 0);
});


test("재전송 성공은 응답 수신 시각부터 5분을 다시 계산한다", () => {
  assert.equal(resendAvailableAt(10_000, 300), 310_000);
  assert.equal(resendCountdownLabel(299), "재전송 (04:59)");
  assert.equal(resendCountdownLabel(0), "재전송");
  // 발송 안내 메시지가 함께 뜨는 상태에서는 남은 시간만 보여준다.
  assert.equal(resendCountdownLabel(300, { timerOnly: true }), "05:00");
  assert.equal(resendCountdownLabel(0, { timerOnly: true }), "재전송");
});
