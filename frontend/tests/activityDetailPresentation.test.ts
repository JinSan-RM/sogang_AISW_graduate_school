import assert from "node:assert/strict";
import test from "node:test";

import { activityCertificationDetailHeading } from "../utils/activityDetailPresentation";

test("스터디 활동 인증 상세는 태그 없이 실제 게시글 제목을 표시한다", () => {
  assert.deepEqual(
    activityCertificationDetailHeading("study-activity", "딥러닝 스터디 모집", "스터디 활동 인증"),
    {
      tagText: null,
      titleText: "딥러닝 스터디 모집",
    },
  );
});

test("제목이 비어 있는 레거시 스터디 활동 인증은 분류명을 제목 대체값으로 사용한다", () => {
  assert.deepEqual(
    activityCertificationDetailHeading("study-activity", "   ", "스터디 활동 인증"),
    {
      tagText: null,
      titleText: "스터디 활동 인증",
    },
  );
});

test("동아리와 네트워킹 활동 인증 상세는 기존 태그를 유지한다", () => {
  assert.deepEqual(
    activityCertificationDetailHeading("club-activity", "등산 후기", "주말 등산 동아리"),
    {
      tagText: "주말 등산 동아리",
      titleText: null,
    },
  );
  assert.deepEqual(
    activityCertificationDetailHeading("networking-activity", "네트워킹 후기", "선후배 네트워킹 데이"),
    {
      tagText: "선후배 네트워킹 데이",
      titleText: null,
    },
  );
});
