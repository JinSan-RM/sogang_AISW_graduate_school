# Password Reset Verification Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the visible password-reset verification countdown with the same status-row and resend-link presentation used by signup.

**Architecture:** Keep the existing API-driven expiry and cooldown state in `password-reset.tsx`. Reuse the shared `resendCountdownLabel(seconds)` formatter and render the password-reset code status row with the same left-message/right-resend-control structure as signup.

**Tech Stack:** React Native, Expo Router, TypeScript, Node test runner, ESLint

## Global Constraints

- Keep the password-reset API and five-minute expiry behavior unchanged.
- Use the existing `resendCountdownLabel` formatter; do not add another countdown formatter.
- Preserve the current expired-state error and primary resend button.
- Do not refactor unrelated authentication screens.

---

### Task 1: Password-reset countdown status row

**Files:**
- Create: `frontend/tests/passwordResetUiVerification.test.ts`
- Create: `frontend/utils/passwordResetUi.ts`
- Modify: `frontend/app/auth/password-reset.tsx`

**Interfaces:**
- Consumes: `resendCountdownLabel(seconds: number): string` from `frontend/utils/signupVerificationUi.ts`
- Produces: `passwordResetResendControl(options): { visible: boolean; disabled: boolean; label: string }` and a password-reset code status row that consumes it

- [x] **Step 1: Write the failing UI contract test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

test("비밀번호 찾기 인증코드는 회원가입과 같은 재전송 카운트다운 상태를 만든다", async () => {
  const passwordResetUi = await import("../utils/passwordResetUi").catch(() => null);
  assert.ok(passwordResetUi, "비밀번호 찾기 카운트다운 UI 모델이 필요합니다.");

  assert.deepEqual(
    passwordResetUi.passwordResetResendControl({
      verificationExpired: false,
      verificationAttemptsLocked: false,
      isSubmitting: false,
      resendCooldown: 300,
    }),
    { visible: true, disabled: true, label: "재전송 (05:00)" }
  );
  assert.equal(
    passwordResetUi.passwordResetResendControl({
      verificationExpired: false,
      verificationAttemptsLocked: false,
      isSubmitting: false,
      resendCooldown: 299,
    }).label,
    "재전송 (04:59)"
  );
});

test("비밀번호 찾기 재전송 상태는 발송 중과 만료·잠금을 구분한다", async () => {
  const passwordResetUi = await import("../utils/passwordResetUi").catch(() => null);
  assert.ok(passwordResetUi, "비밀번호 찾기 카운트다운 UI 모델이 필요합니다.");

  assert.deepEqual(
    passwordResetUi.passwordResetResendControl({
      verificationExpired: false,
      verificationAttemptsLocked: false,
      isSubmitting: true,
      resendCooldown: 120,
    }),
    { visible: true, disabled: true, label: "발송 중" }
  );
  assert.equal(
    passwordResetUi.passwordResetResendControl({
      verificationExpired: true,
      verificationAttemptsLocked: false,
      isSubmitting: false,
      resendCooldown: 0,
    }).visible,
    false
  );
  assert.equal(
    passwordResetUi.passwordResetResendControl({
      verificationExpired: false,
      verificationAttemptsLocked: true,
      isSubmitting: false,
      resendCooldown: 120,
    }).visible,
    false
  );
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `cd frontend && npx tsx --test tests/passwordResetUiVerification.test.ts`

Expected: FAIL with `비밀번호 찾기 카운트다운 UI 모델이 필요합니다.` because `passwordResetUi.ts` does not exist.

- [x] **Step 3: Implement the shared countdown presentation**

Create `frontend/utils/passwordResetUi.ts` with a small screen-state model that reuses the signup label formatter:

```ts
import { resendCountdownLabel } from "./signupVerificationUi";

type PasswordResetResendControlOptions = {
  verificationExpired: boolean;
  verificationAttemptsLocked: boolean;
  isSubmitting: boolean;
  resendCooldown: number;
};

export function passwordResetResendControl(options: PasswordResetResendControlOptions) {
  return {
    visible: !options.verificationExpired && !options.verificationAttemptsLocked,
    disabled: options.isSubmitting || options.resendCooldown > 0,
    label: options.isSubmitting ? "발송 중" : resendCountdownLabel(options.resendCooldown),
  };
}
```

Import and call `passwordResetResendControl` in `password-reset.tsx`. Replace the input's standalone `FieldError` and conditional delivery-only row with the signup-compatible status row:

```tsx
<View style={styles.statusRow}>
  <View style={styles.statusLeft}>
    {codeError ? (
      <View style={styles.messageRow}>
        <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
        <Text style={styles.errorText}>{codeError}</Text>
      </View>
    ) : verificationMessage ? (
      <View style={styles.messageRow}>
        <Ionicons
          name={verificationMessage.type === "success" ? "checkmark-circle-outline" : "alert-circle-outline"}
          size={14}
          color={verificationMessage.type === "success" ? COLORS.successText : COLORS.danger}
        />
        <Text style={verificationMessage.type === "success" ? styles.successText : styles.errorText}>
          {verificationMessage.text}
        </Text>
      </View>
    ) : null}
  </View>
  {resendControl.visible ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: resendControl.disabled }}
      disabled={resendControl.disabled}
      hitSlop={8}
      onPress={() => void requestCode(true)}
      style={styles.resendControlTrailing}
    >
      <Text style={styles.resendLink}>{resendControl.label}</Text>
    </Pressable>
  ) : null}
</View>
```

Define `statusRow`, `statusLeft`, `resendControlTrailing`, and `resendLink` with the same layout, primary color, 13px size, and medium weight as signup. Remove the unused password-reset `verificationStatus` and `timer` styles.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `cd frontend && npx tsx --test tests/passwordResetUiVerification.test.ts`

Expected: 3 tests pass, 0 failures after the screen wiring contract is added.

- [x] **Step 4a: Add and mutation-check the screen wiring contract after review**

Keep the real state-model assertions and add a narrow screen contract proving that `password-reset.tsx` imports the model, passes live countdown state, and renders `resendControl.label` in the status row. Temporarily remove the label rendering, confirm the focused test fails, restore it, and confirm the focused test passes.

- [x] **Step 5: Run the full frontend verification**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`

Expected: all frontend tests pass; typecheck and lint exit with code 0.

- [x] **Step 6: Commit the implementation**

```powershell
git add -- frontend/app/auth/password-reset.tsx frontend/utils/passwordResetUi.ts frontend/tests/passwordResetUiVerification.test.ts docs/superpowers/plans/2026-08-13-password-reset-countdown.md
git commit -m "fix: restore password reset countdown"
```
