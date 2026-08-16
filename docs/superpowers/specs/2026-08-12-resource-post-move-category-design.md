# Resource Post Move Category Design

## Goal

When a resource-sharing post is moved to another resource board, place the post in the target board and show the target board's tag everywhere. For example, moving a post from `종합시험` to `시험족보` must make it appear in the `시험족보` list with the `시험족보` tag while preserving the post ID and related content.

## Affected Boards

| Board slug | User-facing tag |
| --- | --- |
| `lecture-reviews` | `강의후기` |
| `exam-archive` | `시험족보` |
| `comprehensive-exam` | `종합시험` |
| `graduation-thesis` | `졸업논문` |

## Root Cause

The edit flow submits a new `board_id` but also resubmits the post's hidden, old `category`. The update API changes the board and stores that old category without reconciling the two values. Resource list cards, post detail, and My Activity contain paths that prefer the stale category over the current board, so the post moves correctly but can retain its previous tag.

## Design

### Canonical data rule

- A resource post's user-facing category is determined by its current resource board.
- The backend canonicalizes `category` from the resolved target board on both resource creation and update. A client-supplied resource category cannot override the board-derived value.
- A cross-board update continues to preserve the post ID, attachments, comments, likes, and bookmarks and continues to enforce active resource-board and target permission checks.
- Non-resource boards keep their current category behavior.

### Frontend submission

- The resource edit screen resolves the selected board's canonical tag and includes it in the update payload together with `board_id`.
- The backend remains authoritative even if another client sends a stale or missing category.

### Frontend presentation

- A shared resource-board helper maps the four slugs to their user-facing tags.
- Resource list cards and resource post detail prefer the current board's canonical tag over `post.category`.
- My Activity prefers a recognized resource `board_name` over `category`, covering posts that were moved before this fix.
- General search already presents `board_name`, so it requires no display change.
- Existing stale database values stop appearing immediately in these user-facing surfaces. The backend corrects the stored value the next time the post is created or updated; no schema change or data migration is required.

## Error Handling

- Moving outside active `resources` / `resource` boards remains rejected by the API.
- Target-board read/write permission failures remain unchanged.
- Unknown future resource slugs fall back to the target board name in the backend and existing generic display behavior in the frontend.

## Testing

- Backend API tests cover moves among all four board labels and prove that a stale submitted category is replaced by the target board tag.
- Backend tests verify creation also stores the board-derived resource tag and that non-resource category behavior is unchanged.
- Frontend unit tests cover all four slug-to-tag mappings and stale-category overrides.
- Frontend wiring tests cover edit payload normalization, list card, detail, and My Activity presentation.
- Run the targeted backend tests, targeted frontend tests, full backend and frontend suites, backend compile checks, and frontend type checking.

## Out of Scope

- Adding new resource boards or changing the four existing labels.
- Moving posts between resource and non-resource boards.
- Changing resource post content, attachment, comment, reaction, or bookmark semantics.
- Adding a database column or Alembic migration.
