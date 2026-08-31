import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";


const registerSource = readFileSync("app/auth/register.tsx", "utf8");
const privacyScreenSource = readFileSync("app/legal/privacy.tsx", "utf8");
const termsScreenSource = readFileSync("app/legal/terms.tsx", "utf8");


test("회원가입 인증 단계는 최초 발송과 재전송 상태를 구분한다", () => {
  assert.match(registerSource, /setVerificationMessage\(resend \?/);
  assert.match(registerSource, /signupProgressDotIndex\(step\)/);
  assert.match(registerSource, /resendAvailableAt\(responseReceivedAt, resendIn\)/);
  assert.match(registerSource, /resendCountdownLabel\(resendCooldown, \{ timerOnly: showResendTimerOnly \}\)/);
  assert.match(registerSource, /disabled=\{isSubmitting \|\| resendCooldown > 0\}/);
  assert.match(registerSource, /verificationExpired \? \(/);
  assert.match(registerSource, /resendCooldown > 0 \? resendCountdownLabel\(resendCooldown\) : "인증코드 재전송"/);
});


test("회원가입 이름은 동명이인을 오류로 처리하지 않는다", () => {
  assert.doesNotMatch(registerSource, /NICKNAME_CONFLICT/);
  assert.doesNotMatch(registerSource, /이미 사용 중인 이름이에요/);
});


test("개인정보 동의 체크와 전문 열기는 독립적으로 동작한다", () => {
  assert.match(registerSource, /CONSENT_DOCUMENT_SECTIONS\.map/);
  assert.match(registerSource, /visible=\{privacyModalVisible\}/);
  assert.match(registerSource, /onPress=\{togglePrivacyConsent\}/);
  assert.match(registerSource, /accessibilityLabel="이용약관 및 개인정보 처리방침 전문 보기"/);
  assert.match(registerSource, /onPress=\{openPrivacyPolicy\}/);
  assert.match(registerSource, /이용약관 및 개인정보 처리방침 동의 \(필수\)/);
  assert.match(registerSource, /onRequestClose=\{\(\) => setPrivacyModalVisible\(false\)\}/);
  assert.doesNotMatch(registerSource, /privacyReviewed|privacyReadToEnd|hasReachedPrivacyPolicyEnd/);
  assert.doesNotMatch(registerSource, />전문보기<\/Text>/);
  assert.match(privacyScreenSource, /sections=\{PRIVACY_POLICY_ONLY_SECTIONS\}/);
  assert.match(termsScreenSource, /sections=\{TERMS_OF_SERVICE_SECTIONS\}/);
});

test("회원가입과 두 정책 화면은 같은 활성 정책 메타데이터 조회를 사용한다", () => {
  assert.match(registerSource, /useRegistrationOptionsQuery\(\)/);
  assert.match(registerSource, /resolvePrivacyPolicyMetadata\(privacyPolicy\)/);
  assert.match(privacyScreenSource, /useRegistrationOptionsQuery\(\)/);
  assert.match(privacyScreenSource, /resolvePrivacyPolicyMetadata\(/);
  assert.match(termsScreenSource, /useRegistrationOptionsQuery\(\)/);
  assert.match(termsScreenSource, /resolvePrivacyPolicyMetadata\(/);
});
