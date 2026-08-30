# PR #17 Functional-Safe Integration Verification

## Baselines

- Functional/data baseline: `9f151de30286d346c5f6a70ab4a64375c9ac2f7b`
- Event visual baseline: `067e4d989470a05756ad5897481794cdb07d9187`
- Notice/participation visual baseline: `07da71a5559cf59fb91248d7cbf3c9ac6a41ef80`
- QA worktree: `C:\Users\yug67\develope\personal\AISW_app_renewal\.worktrees\pr17-functional-design-integration`
- Browser/runtime: isolated local QA Compose stack, existing seeded fixture, in-app browser set to a 320 × 800 viewport.

## Data safety

- `git diff --exit-code 9f151de -- backend/alembic backend/app/models/event.py backend/app/schemas/event.py backend/seed_test_data.sql docker-compose.override.yml`: PASS (exit 0; no output).
- `git diff --name-only 9f151de | Select-String '0027_event_category_cleanup|council-reply.png'`: PASS (exit 0; no matching path).
- `git diff --check`: PASS (exit 0; no output).
- Legacy categories create/update/read: PASS by `backend/tests/test_event_category_compatibility.py` (6 passed, 1 warning, exit 0). This covers `academic`, `event`, `exam`, `council`, `external`, and `other`.
- Legacy title-only edit: PASS in that same focused compatibility suite; the raw category is retained.
- Runtime-fixture note: the isolated QA volume was already populated (262 users, 864 posts, 1 event). Attempting the supplied SQL fixture import stopped at `ERROR: duplicate key value violates unique constraint "users_email_key"` for `test@sogang.ac.kr` (exit 1), before its first user insert; the existing fixture was retained.

## Automated verification

| Command | Observed result |
| --- | --- |
| `backend/.venv/Scripts/python.exe -m pytest -q` | PASS, exit 0: 331 passed, 1 skipped, 1 warning in 11.78s. The warning is Starlette's `httpx`/`starlette.testclient` deprecation. |
| `backend/.venv/Scripts/python.exe -m compileall app` | PASS, exit 0: `app`, `crud`, `models`, `routers`, and `schemas` listed; four `crud` modules compiled. |
| `npm test` | PASS, exit 0: 384 tests passed; 0 failed, 0 skipped, 0 todo; duration 4460.5359ms. |
| `npm run typecheck` | PASS, exit 0: `tsc --noEmit` completed with no diagnostics. |
| `npm run lint` | PASS with warnings, exit 0: 0 errors and 9 warnings (unused imports/variable warnings in `board/post/[postId].tsx` ×3, `events/[eventId].tsx`, `faq.tsx`, `settings/activity.tsx`, `settings/notifications.tsx`, `BackButton.tsx`, and `PostCard.tsx`). |
| `npm run doctor` | PASS, exit 0: 17/17 checks passed. Expo also reported the intentionally disabled `appConfigFieldsNotSyncedCheck`. |
| `npm run export:web` | PASS, exit 0: web bundle exported to `frontend/dist`; 44 assets, 1 web bundle, 2 files. Six Node `NO_COLOR`/`FORCE_COLOR` warning lines were emitted. |
| `npx expo export --platform all --output-dir $pr17ExportDir` | PASS, exit 0: Web, Android, and iOS bundled and exported to `C:\Users\yug67\AppData\Local\Temp\aisw-pr17-export-d71feae0-9ad2-46fb-af2d-e55940fbc6c2`; 101 assets, one bundle per target, and two metadata files. Six Node `NO_COLOR`/`FORCE_COLOR` warning lines were emitted. |

## Visual verification

All executed browser checks used the existing seeded fixture at a 320px content viewport. Screenshots were captured from the rendered in-app browser; opening the notice result in the Codex browser panel was queued, because subagent browser visibility is unsupported.

| Surface | Outcome | Evidence |
| --- | --- | --- |
| Notice list: 전체/학사공지/행사공지/기타공지, search, dividers | PASS | Rendered `/notices` shows all four filters, a visible search icon, and row separators; seeded rows include academic, event, and other labels. |
| Home notices: labels and no `일정` leak | PASS | Rendered `/home` shows `기타공지` and `행사공지`; the notice section contains no `일정` category label. The fixture did not place an academic row in this home slice. |
| Home schedule: hidden codes, selected date, data and detail navigation | PARTIAL | Rendered home calendar selected 2026-08-30 with no scheduled item and no raw category code. The fixture's only event is 2026-07-25, so its home-month data card was unavailable; list/day/detail navigation was verified below. |
| Schedule list | PASS | Rendered `/events` shows seeded `세미나` labeled `행사일정`, without a raw `event` code. |
| Schedule calendar | PARTIAL | Rendered `/events/calendar` shows the selected 30th and no raw category code, but the August view has no seeded event; academic/other labels cannot be rendered from this fixture. |
| Schedule day and detail navigation | PASS | Rendered `/events/day/2026-07-25` shows `행사일정` and `세미나`; selecting it navigates to `/events/5`, whose detail retains `행사일정`. |
| Schedule labels are only 학사일정/행사일정/기타일정 | NOT EXECUTED for complete family | The fixture has only an `event` row, so only the normalized `행사일정` runtime label was observable. The six-category compatibility test passed separately. |
| Admin schedule edit: event selection | PASS | Rendered admin editor for seeded `세미나` visibly selects `행사일정`; title, date, and details load. |
| Admin schedule edit: exam/council/external and title-only 200 | NOT EXECUTED in browser | No exam/council/external fixture event exists. The focused API compatibility test passed six tests, including title-only raw-category retention, but no browser save was submitted against the fixture. |
| Notice toast | NOT EXECUTED | The seeded runtime exposes an existing comment notification but no deterministic notice-toast trigger; no notice toast was inferred from source or tests. |
| Generic toast | NOT EXECUTED | No deterministic generic-toast trigger was exposed by the rendered seeded UI; no generic toast was inferred from source or tests. |
| Club-guide list and detail | PASS | Rendered participation's club-guide list includes the SG_LLM card; selecting it opens `/board/post/861` with its full club-guide detail and join action. |
| Activity-certification list and detail | PASS | Rendered club activity list shows image cards and metadata; `/board/post/829` renders the activity detail, participant, and attachment. |
| Activity-certification create: name/student-number search | PASS | Rendered create form from the floating add action shows the `이름 또는 학번으로 검색` textbox and supporting participant guidance. |
| Study recruitment list/search | PASS | Rendered Study > 모집 list, then opened its search UI; the `검색어를 입력하세요` textbox became active. |
| Horizontal notice image with full-view control | NOT EXECUTED | The existing notice fixture did not provide a confirmed horizontal notice-image specimen during this run. |
| Ordinary vertical notice image with full-view control | NOT EXECUTED | The existing notice fixture did not provide a confirmed ordinary-vertical notice-image specimen during this run. |
| Long vertical notice image with full-view control | PASS | Rendered notice post 833 has `사진 전체보기`; its loaded image is 1080 × 2280 and is displayed as a tall, constrained image. |
| Council official-reply block | NOT EXECUTED | The populated QA database has no `post_suggestions.admin_reply` row, so no rendered official-reply block was available. |

Approved functional exceptions were retained where observed: notice search, the `이름 또는 학번으로 검색` participant lookup, and `사진 전체보기` are present in the rendered runtime. The notification close affordance and safe-area offset were not independently rendered because neither toast could be triggered; they are approved exceptions, not design misses, when exercised in a notification-capable environment.

## Deferred

- Physical iOS and Android device checks were not executed in this workspace; web exports completed for both native targets.
- Complete rendered coverage of academic/other event labels, exam/council/external admin edit states, title-only browser save, both toast families, horizontal/ordinary-vertical notice-media specimens, and official council replies is blocked by the existing fixture content described above.
- The pre-existing adaptive-image 500px specification versus 600px runtime difference remains unchanged.

## QA process and concerns

- Local QA Compose was started by this task and will be stopped after evidence commit. Its frontend and API were healthy at `http://localhost:58081` and `http://localhost:58000`.
- The in-app browser rendered all executed pages. Its visibility capability is unsupported in this subagent thread; a Codex-panel request for `http://localhost:58081/notices` returned `queued`.
- Rendered console warnings were limited to deprecated `shadow*` styles, deprecated `props.pointerEvents`, and Expo web's unsupported push-token listener. They did not block the rendered checks.
- No application, migration, schema, seed, compose, package, backend, or frontend source file was changed for this QA task.

## Commit and final branch evidence

Commit hash and final `status --short --branch`, `diff --stat 9f151de...HEAD`, and `log --oneline 9f151de..HEAD` results are recorded after the documentation-only commit.
