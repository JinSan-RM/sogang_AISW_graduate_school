import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_PARTICIPANT_GUIDANCE,
  activityCertificationBadgeLabel,
  activityParticipantSelectionError,
  activityParticipantsFromMetadata,
  activitySourcePostFilters,
  activitySourcePostIdFromMetadata,
  buildActivityCertificationMetadata,
  formatActivityParticipant,
} from "../utils/activityCertification";

test("참가자 안내는 미납자·졸업자 제외와 본인 추가를 설명한다", () => {
  assert.match(ACTIVITY_PARTICIPANT_GUIDANCE, /원우회비 미납자, 졸업자는 검색되지 않아요/);
  assert.match(ACTIVITY_PARTICIPANT_GUIDANCE, /본인도 검색해서 추가해주세요/);
});

test("원우회비 납부자는 이름 전공 학번을 띄어쓰기로 표시한다", () => {
  assert.equal(
    formatActivityParticipant({ id: 4, name: "김서강", major: "AI", student_number: "A74001" }),
    "김서강 AI A74001",
  );
});

test("현재 활동인증 metadata의 납부자 ID와 이름을 수정 칩으로 복원한다", () => {
  assert.deepEqual(activityParticipantsFromMetadata({
    participants: "김서강, 이서강",
    participant_dues_payer_ids: [4, 7],
  }), [
    { id: 4, name: "김서강", persisted: true },
    { id: 7, name: "이서강", persisted: true },
  ]);
});

test("기존 회원 기반 참가자는 납부자 ID로 오인하지 않고 레거시 칩으로 복원한다", () => {
  assert.deepEqual(activityParticipantsFromMetadata({
    participants: "72기 김서강, 73기 이서강",
    participant_user_ids: "4,7",
  }), [
    { id: -1, name: "72기 김서강", legacy: true, persisted: true },
    { id: -2, name: "73기 이서강", legacy: true, persisted: true },
  ]);
});

test("현재 명부에서 선택한 참가자만 납부자 ID 배열로 저장한다", () => {
  const metadata = buildActivityCertificationMetadata({
    existingMetadata: {
      participants: "기존 참가자",
      participant_user_ids: "2",
      bank_account: "서강은행 123",
      custom_key: "keep",
    },
    activityDate: "2026.08.15",
    participants: "김서강 AI A74001, 이서강 보안 A74002",
    bankAccount: "",
    selectedParticipants: [
      { id: 4, name: "김서강", major: "AI", student_number: "A74001" },
      { id: 7, name: "이서강", major: "보안", student_number: "A74002" },
    ],
    activitySourcePostId: 10,
  });

  assert.deepEqual(metadata, {
    activity_date: "2026.08.15",
    participants: "김서강 AI A74001, 이서강 보안 A74002",
    participant_dues_payer_ids: [4, 7],
    activity_source_post_id: "10",
    bank_account: "서강은행 123",
    custom_key: "keep",
  });
});

test("선택을 바꾸지 않은 기존 참가자는 레거시 스냅샷을 그대로 보존한다", () => {
  const existingMetadata = {
    participants: "72기 김서강, 73기 이서강",
    participant_user_ids: "4,7",
  };
  const selectedParticipants = activityParticipantsFromMetadata(existingMetadata);

  assert.equal(activityParticipantSelectionError(selectedParticipants, existingMetadata), null);
  assert.deepEqual(buildActivityCertificationMetadata({
    existingMetadata,
    activityDate: "2026.08.15",
    participants: "72기 김서강, 73기 이서강",
    bankAccount: "",
    selectedParticipants,
    activitySourcePostId: null,
  }), {
    activity_date: "2026.08.15",
    participants: "72기 김서강, 73기 이서강",
    participant_user_ids: "4,7",
  });
});

test("기존 회원 기반 참가자 구성을 바꾸면 명부에서 전원 재선택하도록 막는다", () => {
  const existingMetadata = { participants: "기존 참가자", participant_user_ids: "2" };
  const mixed = [
    ...activityParticipantsFromMetadata(existingMetadata),
    { id: 7, name: "김서강", major: "AI", student_number: "A74001" },
  ];

  assert.match(activityParticipantSelectionError(mixed, existingMetadata) ?? "", /전원을 다시 선택/);
  assert.equal(activityParticipantSelectionError([
    { id: 7, name: "김서강", major: "AI", student_number: "A74001" },
  ], existingMetadata), null);
});

test("잘못된 활동 소스 ID는 수정 초기값으로 사용하지 않는다", () => {
  assert.equal(activitySourcePostIdFromMetadata({ activity_source_post_id: "0" }), null);
  assert.equal(activitySourcePostIdFromMetadata({ activity_source_post_id: "not-a-number" }), null);
  assert.equal(activitySourcePostIdFromMetadata(undefined), null);
});

test("동아리 활동 인증 태그는 운영진이 수정한 현재 동아리명을 우선한다", () => {
  assert.equal(
    activityCertificationBadgeLabel(
      { activity_source_title: "서강의 봄", category: "예전 동아리명" },
      "club-activity",
    ),
    "서강의 봄",
  );
});

test("동아리 활동 인증 태그는 연결이 없으면 구체적인 기존 이름으로 대체한다", () => {
  assert.equal(
    activityCertificationBadgeLabel(
      { category: "동아리 활동 인증", metadata: { legacy_activity_name: "서뽈링" } },
      "club-activity",
    ),
    "서뽈링",
  );
  assert.equal(
    activityCertificationBadgeLabel({ category: "활동 인증" }, "club-activity"),
    "동아리 활동 인증",
  );
});

test("스터디와 네트워킹 활동 인증 태그의 기존 분류는 유지한다", () => {
  assert.equal(
    activityCertificationBadgeLabel({ category: "스터디 활동 인증" }, "study-activity"),
    "스터디 활동 인증",
  );
  assert.equal(
    activityCertificationBadgeLabel({ category: "멘토링" }, "networking-activity"),
    "멘토링",
  );
});

test("활동 인증의 원본 선택 목록은 공개된 운영진 게시글만 요청한다", () => {
  assert.deepEqual(activitySourcePostFilters(), { sort: "latest", status: "published" });
});
