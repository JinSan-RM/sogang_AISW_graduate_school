import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";


const registerSource = readFileSync("app/auth/register.tsx", "utf8");
const privacyScreenSource = readFileSync("app/legal/privacy.tsx", "utf8");


test("회원가입 인증 단계는 최초 발송과 재전송 상태를 구분한다", () => {
  assert.match(registerSource, /setVerificationMessage\(resend \?/);
  assert.match(registerSource, /`재전송\$\{resendCooldown > 0/);
  assert.match(registerSource, /formatCountdown\(resendCooldown\)/);
  assert.match(registerSource, /verificationExpired \? \(/);
  assert.match(registerSource, />\{isSubmitting \? "발송 중" : "인증코드 재전송"\}<\/Text>/);
});


test("회원가입 이름은 동명이인을 오류로 처리하지 않는다", () => {
  assert.doesNotMatch(registerSource, /NICKNAME_CONFLICT/);
  assert.doesNotMatch(registerSource, /이미 사용 중인 이름이에요/);
});


test("개인정보 동의는 마이페이지와 같은 전문을 끝까지 확인한 뒤 닫는다", () => {
  assert.match(registerSource, /PRIVACY_POLICY_SECTIONS\.map/);
  assert.match(registerSource, /visible=\{privacyModalVisible\}/);
  assert.match(registerSource, /onContentSizeChange=/);
  assert.match(registerSource, /hasReachedPrivacyPolicyEnd/);
  assert.match(registerSource, /disabled=\{!privacyReadToEnd\}/);
  assert.match(registerSource, /전문을 끝까지 확인한 후 동의할 수 있어요/);
  assert.match(privacyScreenSource, /sections=\{PRIVACY_POLICY_SECTIONS\}/);
});
