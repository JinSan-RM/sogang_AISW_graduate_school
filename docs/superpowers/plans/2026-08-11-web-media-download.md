# Web Media Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make signed post attachments download reliably in the web app without changing native attachment handling.

**Architecture:** A small dependency-injected utility selects same-tab browser navigation for web and React Native external URL opening for native platforms. Post detail and post create/edit resolve the signed URL as before, then delegate only the opening step to this utility.

**Tech Stack:** TypeScript, React Native, Expo Router, Node test runner with `tsx`

## Global Constraints

- Do not change backend media signing, download responses, database records, or migrated filenames.
- Do not change ordinary external-link behavior.
- Preserve existing screen-level error messages.
- Use test-driven development: observe the focused test fail before adding production code.

---

### Task 1: Add platform-specific media opening and wire both attachment screens

**Files:**
- Create: `frontend/utils/mediaOpener.ts`
- Create: `frontend/tests/mediaOpener.test.ts`
- Modify: `frontend/app/board/post/[postId].tsx:5,13,742-747`
- Modify: `frontend/app/board/post/create.tsx:8,13,690-697`

**Interfaces:**
- Consumes: resolved absolute or signed media URL from `resolveMediaAccessUrl(reference)`
- Produces: `openMediaUrl(url: string, options: OpenMediaUrlOptions): Promise<void>`

- [x] **Step 1: Write the failing utility contract tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { openMediaUrl } from "../utils/mediaOpener";

const url = "https://files.example/exam.pdf";

test("웹 첨부는 같은 탭으로 열고 외부 URL 열기를 호출하지 않는다", async () => {
  const calls: string[] = [];

  await openMediaUrl(url, {
    platform: "web",
    assignWebLocation: (nextUrl) => calls.push(`assign:${nextUrl}`),
    openExternalUrl: async (nextUrl) => calls.push(`external:${nextUrl}`),
  });

  assert.deepEqual(calls, [`assign:${url}`]);
});

test("네이티브 첨부는 외부 URL 열기를 사용한다", async () => {
  const calls: string[] = [];

  await openMediaUrl(url, {
    platform: "ios",
    assignWebLocation: (nextUrl) => calls.push(`assign:${nextUrl}`),
    openExternalUrl: async (nextUrl) => calls.push(`external:${nextUrl}`),
  });

  assert.deepEqual(calls, [`external:${url}`]);
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run from `frontend`: `npx tsx --test tests/mediaOpener.test.ts`

Expected: FAIL because `../utils/mediaOpener` does not exist.

- [x] **Step 3: Implement the minimal platform routing utility**

```ts
export type OpenMediaUrlOptions = {
  platform: string;
  assignWebLocation: (url: string) => void;
  openExternalUrl: (url: string) => Promise<unknown>;
};

export async function openMediaUrl(url: string, options: OpenMediaUrlOptions): Promise<void> {
  if (options.platform === "web") {
    options.assignWebLocation(url);
    return;
  }

  await options.openExternalUrl(url);
}
```

- [x] **Step 4: Run the focused test to verify it passes**

Run from `frontend`: `npx tsx --test tests/mediaOpener.test.ts`

Expected: 2 tests pass, 0 fail.

- [x] **Step 5: Wire the post-detail attachment action**

Import `openMediaUrl` from `../../../utils/mediaOpener` and replace `Linking.openURL(accessUrl)` with:

```ts
await openMediaUrl(accessUrl, {
  platform: Platform.OS,
  assignWebLocation: (url) => window.location.assign(url),
  openExternalUrl: (url) => Linking.openURL(url),
});
```

Keep URL resolution and the existing `Alert.alert` catch block unchanged.

- [x] **Step 6: Wire the create/edit attachment action**

Add `Platform` to the React Native import, import `openMediaUrl` from `../../../utils/mediaOpener`, and replace `Linking.openURL(accessUrl)` with the same `openMediaUrl` call from Step 5. Keep `setFormNotice` error handling unchanged.

- [x] **Step 7: Run focused and full verification**

Run from `frontend`:

```text
npx tsx --test tests/mediaOpener.test.ts
npm test
npm run typecheck
npx eslint utils/mediaOpener.ts tests/mediaOpener.test.ts "app/board/post/[postId].tsx" app/board/post/create.tsx
npm run export:web
```

Expected: every command exits 0; focused tests report 2 passes and the web export completes.

- [x] **Step 8: Review and commit the implementation**

Run from the worktree root:

```text
git diff --check
git diff -- frontend/utils/mediaOpener.ts frontend/tests/mediaOpener.test.ts frontend/app/board/post/[postId].tsx frontend/app/board/post/create.tsx
git add frontend/utils/mediaOpener.ts frontend/tests/mediaOpener.test.ts frontend/app/board/post/[postId].tsx frontend/app/board/post/create.tsx docs/superpowers/plans/2026-08-11-web-media-download.md
git diff --cached --check
git commit -m "fix: make web media downloads popup-safe"
```

Expected: only the planned media-opening files are staged and the commit succeeds.
