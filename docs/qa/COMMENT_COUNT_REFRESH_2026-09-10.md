# Comment counts after returning from post detail — 2026-09-10

Work package: CODEX.md WP5 (Phase 3 community), P0 comment/reply flow.

## Report and cause

Deleting the only comment updates the detail screen, but Back returns to a list still showing one comment. `useCreateComment` and `useDeleteComment` only invalidated `comments/<postId>` and `post/<postId>`. The previous list remains mounted in the navigation stack, so returning does not remount its query or fetch a new count.

The API already decrements the count correctly, including replies removed with their parent. No backend, API contract, or navigation change is needed.

## Change

Both successful mutations now await a shared cache refresh for the detail/comments, board and aggregate feeds, multi-board lists, home popular posts, personal activity, admin post lists, and admin comment statistics. Active queries refetch; inactive queries become stale for the next mount. Infinite queries retain their loaded pages, query keys, and filters. The refresh uses server counts rather than assuming each deletion removes exactly one comment. Failed mutation requests leave list data unchanged.

## Verification

`frontend/tests/commentMutationCache.test.ts` invokes the actual hooks with a real QueryClient, QueryObserver/InfiniteQueryObserver, and a controlled Axios adapter. It does not contact production or delete live comments.

- Before the fix: four regressions failed, including expected `0` / actual `1` after deleting the sole comment; failure handling passed.
- After the fix: all five pass. Scenarios cover `1 → 0`, parent/replies `4 → 1`, creation `0 → 1`, active and inactive list caches, admin caches, and failed deletion. Two loaded pages and the search/sort query key are preserved.
- Code review identified the admin list omission; added coverage reproduced it before adding the admin invalidations.
- Full frontend tests: 537 passed. TypeScript and changed-file ESLint passed.

APK: `outputs/android/AI-SW-CAMPUS-0.1.0-3-comment-cache-fix-test.apk`. Includes this fix and the previously verified album-thumbnail fix. It bundles the complete Expo Router app against the existing production API and uses the existing direct-install debug signature. Build evidence is stored beside the APK.

Phase 5 QA: repeat comment delete → header/hardware Back on Android with an explicitly designated test comment, checking list count, scroll position, and filters. This comment fix has automated cache regression coverage; no new screenshot of deleting a live production comment is claimed.
