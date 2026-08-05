import assert from "node:assert/strict";
import test from "node:test";

import {
  composeSchoolEmail,
  apiRetryAfterSeconds,
  formatCountdown,
  isApiResponseUncertain,
  isEmailDeliveryConfirmed,
} from "../utils/authValidation";

test("school email input is normalized before requesting verification", () => {
  assert.equal(composeSchoolEmail("  Student.ID  "), "student.id@sogang.ac.kr");
});

test("verification email delivery advances only on an explicit true response", () => {
  assert.equal(isEmailDeliveryConfirmed(true), true);
  assert.equal(isEmailDeliveryConfirmed(false), false);
  assert.equal(isEmailDeliveryConfirmed(undefined), false);
  assert.equal(isEmailDeliveryConfirmed(null), false);
  assert.equal(isEmailDeliveryConfirmed("true"), false);
});

test("verification countdown keeps the AISW two-digit minute and second format", () => {
  assert.equal(formatCountdown(300), "05:00");
  assert.equal(formatCountdown(299), "04:59");
  assert.equal(formatCountdown(0), "00:00");
});

test("remote SMTP request timeouts are distinguishable from delivery rejection", () => {
  assert.equal(isApiResponseUncertain({ isAxiosError: true, code: "ECONNABORTED" }), true);
  assert.equal(isApiResponseUncertain({ isAxiosError: true, code: "ETIMEDOUT" }), true);
  assert.equal(isApiResponseUncertain({ isAxiosError: true, code: "ERR_NETWORK" }), true);
  assert.equal(
    isApiResponseUncertain({
      isAxiosError: true,
      code: "ERR_BAD_RESPONSE",
      response: { status: 503 },
    }),
    false,
  );
  assert.equal(isApiResponseUncertain(new Error("timeout")), false);
});

test("retry-after parsing accepts only a bounded integer header", () => {
  assert.equal(
    apiRetryAfterSeconds({
      isAxiosError: true,
      response: { headers: { "retry-after": "245" } },
    }),
    245,
  );
  assert.equal(
    apiRetryAfterSeconds({
      isAxiosError: true,
      response: { headers: { "retry-after": "invalid" } },
    }),
    undefined,
  );
});
