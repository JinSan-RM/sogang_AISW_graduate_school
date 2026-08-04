import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canDeleteMutualAidRequest,
  canEditMutualAidRequest,
  isUnchangedMutualAidEventDate,
  mutualAidEventTypeLabel,
  mutualAidRelationLabel,
  normalizeMutualAidEventDate,
} from "../utils/mutualAid";

const detailSource = readFileSync("app/board/post/[postId].tsx", "utf8");
const editFormSource = readFileSync("app/board/post/create.tsx", "utf8");

test("상조회 작성자 작업 권한은 처리중·완료·반려 상태별 정책을 따른다", () => {
  assert.equal(canEditMutualAidRequest("processing"), true);
  assert.equal(canEditMutualAidRequest("completed"), false);
  assert.equal(canEditMutualAidRequest("rejected"), false);

  assert.equal(canDeleteMutualAidRequest("processing"), true);
  assert.equal(canDeleteMutualAidRequest("completed"), false);
  assert.equal(canDeleteMutualAidRequest("rejected"), true);
});

test("상조회 수정 값은 API 형식을 신청 양식 표기로 복원한다", () => {
  assert.equal(normalizeMutualAidEventDate("2026-08-04"), "2026.08.04");
  assert.equal(isUnchangedMutualAidEventDate("2026.08.04", "2026-08-04"), true);
  assert.equal(mutualAidEventTypeLabel("wedding"), "결혼");
  assert.equal(mutualAidRelationLabel("self"), "본인");
});

test("상조회 수정은 전용 신청 양식으로 이동하고 상태별 메뉴를 분리한다", () => {
  assert.match(detailSource, /isActivityCertification \|\| isMutualAidRequest/);
  assert.match(detailSource, /canEditMutualAidRequest\(post\.mutual_aid\?\.status\)/);
  assert.match(detailSource, /canDeleteMutualAidRequest\(post\.mutual_aid\?\.status\)/);
});

test("상조회 수정 양식은 확장정보와 기존 첨부를 복원하고 첨부 변경을 저장한다", () => {
  assert.match(editFormSource, /existingPost\.mutual_aid\?\.event_type/);
  assert.match(editFormSource, /existingPost\.mutual_aid\?\.event_date/);
  assert.match(editFormSource, /existingPost\.mutual_aid\?\.relation/);
  assert.match(editFormSource, /setAttachments\(existingPost\.attachments\)/);
  assert.match(editFormSource, /resolveMediaAccessUrl\(attachment\)/);
  assert.match(editFormSource, /attachment_ids: attachmentIds/);
});
