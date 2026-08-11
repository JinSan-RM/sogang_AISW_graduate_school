# Exam Archive File Attachments Implementation Plan

> **For Codex:** Execute this plan task-by-task with the `executing-plans` skill and preserve the pre-existing activity-participant edits in `create.tsx` outside the implementation commit.

**Goal:** Let users creating an Exam Archive post attach images separately from all document formats already accepted by the backend.

**Architecture:** Reuse the existing media upload client and attachment rendering. Extract the create screen's shared upload-state handling around a picker callback, then expose two Exam Archive-only actions: the existing image picker and document picker. Other board creation flows retain their existing single attachment action and picker selection.

**Tech Stack:** React Native, Expo Image Picker, Expo Document Picker, TypeScript, pure action-model tests via Node test runner

---

### Task 1: Capture the Exam Archive UI contract in a failing test

**Files:**
- Create: `frontend/tests/examArchiveAttachments.test.ts`

- [x] Assert the Exam Archive action model contains distinct `이미지 첨부` and `파일 첨부` controls.
- [x] Assert those actions invoke the image and document upload callbacks respectively.
- [x] Assert the action model is gated by the `exam-archive` slug so other board UI remains unchanged.
- [x] Run the focused test from `frontend` and confirm it fails before implementation.

### Task 2: Add shared upload handling and Exam Archive actions

**Files:**
- Modify: `frontend/app/board/post/create.tsx`
- Test: `frontend/tests/examArchiveAttachments.test.ts`

- [x] Add an `isExamArchive` board flag.
- [x] Extract the common loading, progress, success append, and error-notice flow around a picker callback.
- [x] Keep the existing `selectFile` behavior for album, activity, admin participation, and ordinary boards.
- [x] Add image-only and document-only callbacks for Exam Archive.

### Task 3: Render the two Exam Archive attachment controls

**Files:**
- Modify: `frontend/app/board/post/create.tsx`
- Test: `frontend/tests/examArchiveAttachments.test.ts`

- [x] Render two compact controls only when `isExamArchive` is true.
- [x] Reuse the existing upload-progress text and disabled state.
- [x] Keep the existing thumbnail/file-name lists and remove buttons unchanged.
- [x] Add only the minimal layout style needed for the two controls.
- [x] Run the focused attachment test and frontend typecheck.

### Task 4: Verify allowed document coverage and stage only intended hunks

**Files:**
- Verify: `frontend/utils/mediaPicker.ts`
- Verify: `backend/app/config.py`
- Verify: `frontend/app/board/post/create.tsx`
- Verify: `frontend/tests/examArchiveAttachments.test.ts`

- [x] Confirm the document picker passes selected files through the existing upload API.
- [x] Confirm backend configuration still permits PDF, PPT/PPTX, DOC/DOCX, XLS/XLSX, and HWP.
- [x] Run the complete frontend test suite, typecheck, and relevant lint.
- [x] Keep the original dirty workspace isolated and stage only this branch's `create.tsx` changes.
