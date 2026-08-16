# Account Deletion UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the supplied authenticated account-deletion completion reference while preserving current-password verification and the detailed public email-deletion completion flow.

**Architecture:** Add one pure selector for the explicit `completed=1` member-completion signal. Consume it in the existing public account-deletion route to render the shared `CompletionState` before the unchanged public success branch.

**Tech Stack:** React Native 0.81, Expo Router 6, React 19, TypeScript 5.9, Node `node:test`

## Global Constraints

- Preserve `DELETE /api/users/me` current-password verification.
- Preserve session and push-token cleanup before completion navigation.
- Only `completed=1` selects the compact authenticated completion UI.
- Preserve the email-code public deletion request, verification, and detailed completion states.
- Do not change backend APIs, database schema, permissions, or retention policy.
- Preserve unrelated tracked changes and existing untracked user files.

---

## File Structure

- Modify `frontend/utils/accountDeletion.ts`: expose the compact authenticated-completion presentation selector.
- Modify `frontend/tests/accountDeletion.test.ts`: cover the explicit member/public completion distinction.
- Modify `frontend/app/legal/account-deletion.tsx`: render `CompletionState` for authenticated completion only.
- Create `frontend/utils/tabBarVisibility.ts`: decide whether a tab-group route is full-screen.
- Create `frontend/tests/tabBarVisibility.test.ts`: protect account-deletion-only tab hiding.
- Modify `frontend/app/(tabs)/_layout.tsx`: hide the bottom tab bar on the member deletion route.
- Modify `docs/phase2/FRONTEND_ROUTE_SPEC.md`: record the two completion variants and retained password requirement.
- Modify `CODEX.md`: record the completed P0 UI alignment after verification.

### Task 1: Tested authenticated-completion selector

**Files:**
- Modify: `frontend/utils/accountDeletion.ts`
- Test: `frontend/tests/accountDeletion.test.ts`

**Interfaces:**
- Consumes: the optional `completed` route query string.
- Produces: `MemberAccountDeletionSuccessPresentation` and `getMemberAccountDeletionSuccessPresentation(completed)`.

- [ ] **Step 1: Write the failing behavior test**

Add this test to `frontend/tests/accountDeletion.test.ts`:

```ts
test("인앱 탈퇴 완료 신호만 간결한 완료 화면과 로그인 확인 동작을 선택한다", () => {
  assert.deepEqual(getMemberAccountDeletionSuccessPresentation("1"), {
    title: "탈퇴가 완료되었어요!",
    buttonLabel: "확인",
    confirmRoute: "/auth/login",
  });
  assert.equal(getMemberAccountDeletionSuccessPresentation(undefined), null);
  assert.equal(getMemberAccountDeletionSuccessPresentation("0"), null);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test -- --test-name-pattern="인앱 탈퇴 완료 신호"`

Expected: FAIL because `getMemberAccountDeletionSuccessPresentation` is not exported.

- [ ] **Step 3: Implement the minimal selector**

Add to `frontend/utils/accountDeletion.ts`:

```ts
export type MemberAccountDeletionSuccessPresentation = {
  title: "탈퇴가 완료되었어요!";
  buttonLabel: "확인";
  confirmRoute: "/auth/login";
};

export function getMemberAccountDeletionSuccessPresentation(
  completed?: string,
): MemberAccountDeletionSuccessPresentation | null {
  if (completed !== "1") return null;
  return {
    title: "탈퇴가 완료되었어요!",
    buttonLabel: "확인",
    confirmRoute: "/auth/login",
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test -- --test-name-pattern="인앱 탈퇴 완료 신호"`

Expected: PASS.

- [ ] **Step 5: Commit the selector and test**

```bash
git add frontend/utils/accountDeletion.ts frontend/tests/accountDeletion.test.ts
git commit -m "test: define member deletion completion"
```

### Task 2: Full-screen member deletion route

**Files:**
- Create: `frontend/utils/tabBarVisibility.ts`
- Create: `frontend/tests/tabBarVisibility.test.ts`
- Modify: `frontend/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: the current Expo Router pathname.
- Produces: `shouldHideTabBar(pathname)` and a hidden tab bar only for `/settings/account-deletion`.

- [ ] **Step 1: Write and run the failing route behavior test**

Assert that `/settings/account-deletion` with or without a trailing slash returns `true`, while `/settings/account`, `/settings`, and `/home` return `false`.

Run: `npx tsx --test tests/tabBarVisibility.test.ts`

Expected: FAIL because `frontend/utils/tabBarVisibility.ts` does not exist.

- [ ] **Step 2: Implement the minimal helper and layout integration**

Normalize a trailing slash and compare the pathname with `/settings/account-deletion`. Use `usePathname()` in the tab layout and set the existing `tabBarStyle` to `{ display: "none" }` only when the helper returns `true`.

- [ ] **Step 3: Run the focused test and typecheck**

Run:

```bash
npx tsx --test tests/tabBarVisibility.test.ts
npm run typecheck
```

Expected: PASS.

### Task 3: Route integration and contract documentation

**Files:**
- Modify: `frontend/app/legal/account-deletion.tsx`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Consumes: `getMemberAccountDeletionSuccessPresentation(params.completed)` and `CompletionState`.
- Produces: the compact member completion for `completed=1`; the existing public completion for all public verification successes.

- [ ] **Step 1: Add the member completion branch**

Import `CompletionState` and the selector. Compute the presentation from `params.completed`, then place this branch before the existing `step === "success"` branch:

```tsx
if (memberSuccessPresentation) {
  return (
    <CompletionState
      buttonLabel={memberSuccessPresentation.buttonLabel}
      onConfirm={() => router.replace(memberSuccessPresentation.confirmRoute)}
      title={memberSuccessPresentation.title}
    />
  );
}
```

Do not modify the existing public success JSX.

- [ ] **Step 2: Update route and backlog documentation**

Record that current-password verification remains mandatory, `completed=1` uses the compact reference completion, and public email deletion retains the detailed completion state.

- [ ] **Step 3: Run full static and behavioral verification**

Run:

```bash
npm run test
npm run typecheck
npm run lint
```

Expected: all tests and typecheck pass; lint has no errors.

- [ ] **Step 4: Verify the running UI at mobile width**

Start local QA, open `/legal/account-deletion?completed=1` at 360px width, and capture the outlined green check, `탈퇴가 완료되었어요!`, and `확인` button. Open `/legal/account-deletion` without the parameter and confirm the public request flow still renders.

- [ ] **Step 5: Commit the route and documentation**

```bash
git add frontend/app/legal/account-deletion.tsx docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "feat: align account deletion completion"
```
