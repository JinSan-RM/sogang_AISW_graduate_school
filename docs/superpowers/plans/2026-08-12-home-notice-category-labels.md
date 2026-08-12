# Home Notice Category Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw Home notice category codes with `학사공지`, `행사공지`, `기타공지`, or an existing user-facing Korean tag.

**Architecture:** Add a Home-only display helper on top of the existing shared notice category normalization. Pass active notice boards into the Home notice list so a missing post category can fall back to its board slug; do not change stored categories, backend responses, the Notices tab, or Home's latest-two selection.

**Tech Stack:** TypeScript, React Native, Expo Router, Node test runner via `tsx`

## Global Constraints

- Change only the category label and category dot shown in the Home notice area.
- Map academic aliases to `학사공지`.
- Map event, webinar, and special-lecture aliases to `행사공지` on Home.
- Map other, all, and general aliases to `기타공지`.
- Fall back to the notice board slug when a post category is missing.
- Preserve an existing user-facing Korean tag outside the known aliases.
- Preserve Home's latest-two ordering, the Notices tab, stored category values, backend APIs, and unrelated user files.

## File Structure

- Modify `frontend/utils/noticeFeed.ts`: add the Home-only presentation helper.
- Modify `frontend/tests/noticeFeed.test.ts`: verify known aliases, board fallback, and custom Korean tags.
- Modify `frontend/tests/homeNoticeSelection.test.ts`: guard the Home wiring and removal of the duplicate local category mapper.
- Modify `frontend/app/(tabs)/home.tsx`: pass notice boards into `NoticeList` and render the normalized Home label.
- Modify `docs/phase2/FRONTEND_ROUTE_SPEC.md` and `CODEX.md`: record the Home-only presentation rule.

---

### Task 1: Add the Home Category Presentation Helper

**Files:**
- Modify: `frontend/tests/noticeFeed.test.ts`
- Modify: `frontend/utils/noticeFeed.ts`

**Interfaces:**
- Consumes: `categoryFromNoticePost(post: PostListItem, board?: Board): string`.
- Produces: `homeNoticeCategory(post: PostListItem, board?: Board): string`.

- [ ] **Step 1: Write failing tests for the Home labels**

Add a pre-implementation accessor to `frontend/tests/noticeFeed.test.ts`:

```ts
type HomeNoticeCategory = (post: PostListItem, board?: Board) => string;

function homeCategory(postItem: PostListItem, boardItem?: Board) {
  const helper = (noticeFeed as typeof noticeFeed & { homeNoticeCategory?: HomeNoticeCategory }).homeNoticeCategory;
  if (!helper) assert.fail("homeNoticeCategory must be exported");
  return helper(postItem, boardItem);
}
```

Add the label cases:

```ts
test("홈 공지 분류는 raw other를 기타공지로 표시한다", () => {
  assert.equal(homeCategory(post(1, 1, "other"), board(1, "all-notices")), "기타공지");
});

test("홈 공지 분류는 특강과 웨비나를 행사공지로 표시한다", () => {
  assert.equal(homeCategory(post(1, 4, "webinar"), board(4, "webinar-notices")), "행사공지");
  assert.equal(homeCategory(post(2, 4, "특강공지"), board(4, "webinar-notices")), "행사공지");
});

test("홈 공지 분류는 category가 없으면 게시판으로 판별한다", () => {
  assert.equal(homeCategory(post(1, 2), board(2, "academic-notices")), "학사공지");
  assert.equal(homeCategory(post(2, 3), board(3, "event-notices")), "행사공지");
});

test("홈 공지 분류는 별도 한글 태그명을 유지한다", () => {
  assert.equal(homeCategory(post(1, 1, "장학공지"), board(1, "all-notices")), "장학공지");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `frontend`:

```powershell
npx tsx --test tests/noticeFeed.test.ts
```

Expected: the four new tests fail with `homeNoticeCategory must be exported`; existing notice tests remain green.

- [ ] **Step 3: Implement the minimal Home helper**

Add to `frontend/utils/noticeFeed.ts`:

```ts
export function homeNoticeCategory(post: PostListItem, board?: Board) {
  const category = categoryFromNoticePost(post, board);
  return category === "특강공지" ? "행사공지" : category;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run from `frontend`:

```powershell
npx tsx --test tests/noticeFeed.test.ts
```

Expected: all notice-feed tests pass, including raw `other`, webinar/special-lecture, board fallback, and custom-tag cases.

- [ ] **Step 5: Commit the category helper**

```powershell
git add -- frontend/utils/noticeFeed.ts frontend/tests/noticeFeed.test.ts
git commit -m "feat: normalize home notice category labels"
```

---

### Task 2: Render the Category Label on Home

**Files:**
- Modify: `frontend/tests/homeNoticeSelection.test.ts`
- Modify: `frontend/app/(tabs)/home.tsx`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Consumes: `homeNoticeCategory(post, board?)`, `noticeBoards: Board[]`, and the existing latest-two `notices` list.
- Produces: a Home metadata line and dot based on the final user-facing category label.

- [ ] **Step 1: Write the failing Home integration assertions**

Append to the existing Home contract test in `frontend/tests/homeNoticeSelection.test.ts`:

```ts
assert.match(homeSource, /boards=\{noticeBoards\}/);
assert.match(homeSource, /homeNoticeCategory\(post, boardById\.get\(post\.board_id\)\)/);
assert.doesNotMatch(homeSource, /function noticeCategoryLabel/);
assert.doesNotMatch(homeSource, /noticeCategoryLabel\(post\.category\)/);
```

- [ ] **Step 2: Run the Home contract test and verify RED**

Run from `frontend`:

```powershell
npx tsx --test tests/homeNoticeSelection.test.ts
```

Expected: FAIL because `NoticeList` does not accept `boards`, Home does not call `homeNoticeCategory`, and the duplicate local mapper still exists.

- [ ] **Step 3: Wire normalized labels into `NoticeList`**

In `frontend/app/(tabs)/home.tsx`, import the helper:

```ts
import { homeNoticeCategory, homeNoticePosts, isNoticeContentBoard } from "../../utils/noticeFeed";
```

Delete the local `noticeCategoryLabel` function. Add `boards` to `NoticeList` and derive the board map:

```ts
function NoticeList({
  posts,
  boards,
  loading,
  isError,
  onRetry,
}: {
  posts: PostListItem[];
  boards: Board[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const boardById = new Map(boards.map((board) => [board.id, board]));
```

Change the row map to calculate one display label and reuse it for the dot and metadata:

```tsx
{rows.map((post, index) => {
  const category = homeNoticeCategory(post, boardById.get(post.board_id));
  return (
    <Pressable
      key={post.id}
      onPress={() => router.push(`/board/post/${post.id}` as never)}
      style={[styles.noticeRow, index === rows.length - 1 ? styles.noticeRowLast : null]}
    >
      <View style={[styles.noticeDot, { backgroundColor: noticeDotColor(category) }]} />
      <View style={styles.noticeContent}>
        <Text style={styles.noticeTitle} numberOfLines={1}>{post.title}</Text>
        <Text style={styles.noticeMeta} numberOfLines={1}>
          {category} · {formatBoardDate(post.created_at)}
          {post.deadline_at ? ` · 마감 ${dDayLabel(post.deadline_at)}` : ""}
        </Text>
      </View>
    </Pressable>
  );
})}
```

Pass the active notice boards from Home:

```tsx
<NoticeList
  posts={notices}
  boards={noticeBoards}
  loading={noticesQuery.isLoading || boardsLoading}
  isError={boardsError || noticesQuery.isError}
  onRetry={() => void Promise.all([refetchBoards(), noticesQuery.refetch()])}
/>
```

- [ ] **Step 4: Update the frontend contract records**

Add to the Home presentation rules in `docs/phase2/FRONTEND_ROUTE_SPEC.md`:

```markdown
- Home notice metadata uses `학사공지`, `행사공지`, or `기타공지`; webinar/special-lecture aliases are presented as `행사공지`, and raw codes such as `other` are never shown.
```

Append to the completed Home notice entry in `CODEX.md`:

```markdown
Home notice metadata now resolves post and board aliases to user-facing tags, grouping webinar/special-lecture under `행사공지` and replacing raw `other` with `기타공지`.
```

- [ ] **Step 5: Run both focused test files and verify GREEN**

Run from `frontend`:

```powershell
npx tsx --test tests/noticeFeed.test.ts tests/homeNoticeSelection.test.ts
```

Expected: all focused tests pass without warnings or unhandled errors.

- [ ] **Step 6: Commit the Home presentation change**

```powershell
git add -- 'frontend/app/(tabs)/home.tsx' frontend/tests/homeNoticeSelection.test.ts docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "fix: show notice category labels on home"
```

---

### Task 3: Verify the Complete Frontend Change

**Files:**
- Verify only; no file changes expected.

**Interfaces:**
- Consumes: the Home category helper and Home rendering from Tasks 1 and 2.
- Produces: full frontend regression and type-safety evidence.

- [ ] **Step 1: Run the full frontend suite**

From `frontend`:

```powershell
npm test
```

Expected: zero failing tests.

- [ ] **Step 2: Run the frontend typecheck**

From `frontend`:

```powershell
npm run typecheck
```

Expected: TypeScript exits with code `0` and no diagnostics.

- [ ] **Step 3: Verify formatting and scope**

From the repository root:

```powershell
git diff --check HEAD~2..HEAD
git status --short
```

Expected: no whitespace errors; unrelated pre-existing user files remain untouched.
