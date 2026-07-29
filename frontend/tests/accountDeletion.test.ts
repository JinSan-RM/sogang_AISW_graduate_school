import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDeletionErrorMessage,
  isAccountDeletionCodeValid,
  isDeletionConfirmationValid,
  publicAccountDeletionErrorMessage,
} from "../utils/accountDeletion";

test("계정 삭제 확인 문구는 공백을 제외하고 정확히 일치해야 한다", () => {
  assert.equal(isDeletionConfirmationValid(ACCOUNT_DELETION_CONFIRMATION), true);
  assert.equal(isDeletionConfirmationValid(`  ${ACCOUNT_DELETION_CONFIRMATION}  `), true);
  assert.equal(isDeletionConfirmationValid("삭제"), false);
  assert.equal(isDeletionConfirmationValid("계정삭제"), false);
});

test("계정 삭제 인증 코드는 6자리 숫자만 허용한다", () => {
  assert.equal(isAccountDeletionCodeValid("123456"), true);
  assert.equal(isAccountDeletionCodeValid(" 123456 "), true);
  assert.equal(isAccountDeletionCodeValid("12345"), false);
  assert.equal(isAccountDeletionCodeValid("12345a"), false);
});

test("인앱 삭제 오류를 세션, 비밀번호, 관리자 제한으로 구분한다", () => {
  assert.match(accountDeletionErrorMessage(401), /세션이 만료/);
  assert.match(accountDeletionErrorMessage(403), /현재 비밀번호/);
  assert.match(accountDeletionErrorMessage(409, "ADMIN_ACCOUNT_DELETION_FORBIDDEN"), /관리자 계정/);
  assert.match(accountDeletionErrorMessage(429), /요청이 너무 많습니다/);
  assert.match(accountDeletionErrorMessage(0), /네트워크/);
  assert.match(accountDeletionErrorMessage(500), /처리하지 못했습니다/);
});

test("공개 삭제 확인 오류는 계정 존재 여부나 실패 항목을 구분해 노출하지 않는다", () => {
  const invalid = publicAccountDeletionErrorMessage(400, "ACCOUNT_DELETION_INVALID");
  assert.match(invalid, /요청 정보를 확인할 수 없거나/);
  assert.match(invalid, /이메일, 인증 코드와 비밀번호/);
  assert.doesNotMatch(invalid, /존재하지/);
  assert.match(publicAccountDeletionErrorMessage(429), /요청이 너무 많습니다/);
});
