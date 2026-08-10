# Signup Flow Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the approved signup verification and consent interactions, keep resend behavior reliable at the cooldown boundary, and prevent regressions with tests.

**Architecture:** Keep the existing Expo Router signup screen and backend API contract. Extract only deterministic verification-display calculations into a small frontend utility so countdown and progress behavior can be tested directly; keep the consent row and policy reader in the existing screen while removing the obsolete scroll-to-unlock state.

**Tech Stack:** React Native, Expo Router, TypeScript, Node test runner through `tsx`, FastAPI API contract documentation.

## Global Constraints

- The verification-code screen activates the first visible progress dot.
- A successful initial send or resend starts a fresh `04:59` countdown from the response receipt time.
- Resend remains disabled while the countdown is positive and becomes available at zero.
- A successful resend invalidates the previous code through the unchanged backend endpoint.
- The consent checkbox toggles independently without opening or reading the document.
- Only the right chevron opens the consent document, which can close at any scroll position.
- Signup still requires `privacy_consent: true` and the active `privacy_policy_version`.
- Preserve unrelated user files and changes in the dirty worktree.

---

### Task 1: Verification progress and resend countdown

**Files:**
- Create: `frontend/utils/signupVerificationUi.ts`
- Create: `frontend/tests/signupVerificationUi.test.ts`
- Modify: `frontend/app/auth/register.tsx:52-56, 183-195, 460-501`
- Modify: `frontend/tests/registerUiVerification.test.ts:10-16`

**Interfaces:**
- Produces: `signupProgressDotIndex(step: number): number`
- Produces: `resendAvailableAt(responseReceivedAt: number, resendInSeconds: number): number`
- Produces: `resendCountdownLabel(seconds: number): string`
- Consumes: existing `formatCountdown(seconds: number): string`

- [ ] **Step 1: Write failing deterministic behavior tests**

```ts
test("인증코드 화면은 첫 번째 진행 점을 활성화한다", () => {
  assert.equal(signupProgressDotIndex(1), 0);
});

test("재전송 성공은 응답 수신 시각부터 5분을 다시 계산한다", () => {
  assert.equal(resendAvailableAt(10_000, 300), 310_000);
  assert.equal(resendCountdownLabel(299), "재전송 (04:59)");
  assert.equal(resendCountdownLabel(0), "재전송");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm exec -- tsx --test tests/signupVerificationUi.test.ts`

Expected: FAIL because `utils/signupVerificationUi.ts` does not exist.

- [ ] **Step 3: Implement the utility and wire it into the screen**

```ts
export function signupProgressDotIndex(step: number): number {
  return Math.max(0, step - 1);
}

export function resendAvailableAt(responseReceivedAt: number, resendInSeconds: number): number {
  return responseReceivedAt + resendInSeconds * 1000;
}

export function resendCountdownLabel(seconds: number): string {
  return seconds > 0 ? `재전송 (${formatCountdown(seconds)})` : "재전송";
}
```

Use `signupProgressDotIndex(step)` in `StepDots`. Set `resendAvailableAtRef.current` after the response is received. Render the resend label as a single disabled control during cooldown; when a success message exists, keep the message on the left and the reset countdown on the right.

- [ ] **Step 4: Run focused verification tests and verify GREEN**

Run: `npm exec -- tsx --test tests/signupVerificationUi.test.ts tests/registerUiVerification.test.ts`

Expected: all focused tests pass.

- [ ] **Step 5: Commit the verification behavior**

```powershell
git add -- frontend/utils/signupVerificationUi.ts frontend/tests/signupVerificationUi.test.ts frontend/tests/registerUiVerification.test.ts frontend/app/auth/register.tsx
git commit -m "fix(frontend): restore signup resend countdown"
```

### Task 2: Independent signup consent and optional disclosure

**Files:**
- Modify: `frontend/app/auth/register.tsx:23-27, 75-100, 124-148, 293-323, 558-581, 616-670`
- Modify: `frontend/tests/registerUiVerification.test.ts:25-32`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:177-183`
- Modify: `CODEX.md:152`

**Interfaces:**
- Consumes: `privacyPolicy` from the public registration-options query.
- Preserves: `togglePrivacyConsent(): void`, now a direct boolean toggle.
- Preserves: `openPrivacyPolicy(): void`, invoked only by the chevron.

- [ ] **Step 1: Replace the obsolete review-gate test with failing interaction assertions**

```ts
test("개인정보 동의 체크와 전문 열기는 독립적으로 동작한다", () => {
  assert.match(registerSource, /onPress=\{togglePrivacyConsent\}/);
  assert.match(registerSource, /accessibilityLabel="이용약관 및 개인정보 처리방침 전문 보기"/);
  assert.match(registerSource, /onPress=\{openPrivacyPolicy\}/);
  assert.doesNotMatch(registerSource, /privacyReviewed|privacyReadToEnd|hasReachedPrivacyPolicyEnd/);
  assert.doesNotMatch(registerSource, />전문보기<\/Text>/);
  assert.match(registerSource, /이용약관 및 개인정보 처리방침 동의 \(필수\)/);
});
```

- [ ] **Step 2: Run the consent test and verify RED**

Run: `npm exec -- tsx --test tests/registerUiVerification.test.ts`

Expected: FAIL because the source still contains the scroll-to-end gate and `전문보기` label.

- [ ] **Step 3: Implement the approved Figma interaction**

Remove `privacyReviewed`, `privacyReadToEnd`, scroll measurement state, the reviewed-version ref, and `hasReachedPrivacyPolicyEnd`. Make `togglePrivacyConsent` toggle immediately. Keep the checkbox disabled only when policy metadata is unavailable. Render only the chevron as the separate disclosure control. Make the modal back action and footer close action call `setPrivacyModalVisible(false)` without a scroll condition.

- [ ] **Step 4: Update the product contract and backlog record**

Replace the old scroll-to-end requirement in `FRONTEND_ROUTE_SPEC.md` and `CODEX.md` with the approved decision: explicit checkbox consent is independent, only the chevron opens the full document, and backend version/consent validation remains required.

- [ ] **Step 5: Run the focused consent test and verify GREEN**

Run: `npm exec -- tsx --test tests/registerUiVerification.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit consent and documentation**

```powershell
git add -- frontend/app/auth/register.tsx frontend/tests/registerUiVerification.test.ts docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "fix(frontend): separate signup consent review"
```

### Task 3: Full frontend verification

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes the completed signup verification and consent behavior from Tasks 1 and 2.
- Produces fresh completion evidence.

- [ ] **Step 1: Run all frontend tests**

Run: `npm test`

Expected: zero failing tests.

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: exit code 0 with zero errors and zero warnings.

- [ ] **Step 4: Inspect the final commits and worktree**

```powershell
git diff HEAD~2..HEAD --check
git log -3 --oneline
git status --short
```

Expected: no whitespace errors; only pre-existing unrelated untracked files remain outside the two implementation commits.
