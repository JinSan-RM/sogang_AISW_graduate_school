# Password Reset Verification Countdown Design

Date: 2026-08-13

## Goal

Restore the visible five-minute countdown on the password-reset verification-code screen and make its presentation match the signup verification screen.

## Scope

- Keep the existing password-reset API and five-minute expiry behavior unchanged.
- Show the resend countdown beside the delivery-status message below the verification-code input.
- Use the same `재전송 (MM:SS)` label and visual hierarchy as signup.
- Reset the displayed countdown from the API response time after a successful resend.
- Preserve the current password-reset expired-state error and primary resend button.
- Add a focused frontend regression contract for the password-reset screen.

## UI Behavior

While the code is valid, the status row below the input shows the delivery result on the left and `재전송 (05:00)` on the right. The timer decreases once per second using the existing server-provided `resend_in` value. The countdown presentation reuses the signup formatter so both authentication flows produce the same label.

When the countdown reaches zero, the existing password-reset expired state remains authoritative: the input shows the expiry error and the primary action becomes `인증코드 재전송`. A successful resend clears the previous code and failure state, then starts a new countdown from the response-received time.

## Implementation Boundaries

- Reuse `resendCountdownLabel` from `frontend/utils/signupVerificationUi.ts`; do not introduce a second formatter.
- Render the countdown only in the password-reset code-entry mode.
- Do not change backend expiry, cooldown, rate limits, email delivery, or verification-token behavior.
- Do not refactor unrelated authentication screens.

## Verification

- Add a test that fails when the password-reset screen no longer renders the shared resend-countdown label.
- Run the focused frontend test first and observe the missing-label failure.
- Implement the minimal UI change and rerun the focused test.
- Run the full frontend test suite, TypeScript typecheck, and ESLint.
