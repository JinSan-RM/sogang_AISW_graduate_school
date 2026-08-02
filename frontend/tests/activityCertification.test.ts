import assert from "node:assert/strict";
import test from "node:test";

import {
  activityParticipantsFromMetadata,
  activitySourcePostIdFromMetadata,
  buildActivityCertificationMetadata,
  formatActivityParticipant,
} from "../utils/activityCertification";

test("활동인증 수정 시 저장된 참가자 이름과 사용자 ID를 칩으로 복원한다", () => {
  const participants = activityParticipantsFromMetadata({
    participants: "72기 김서강, 73기 이서강",
    participant_user_ids: "4, 7",
  });

  assert.deepEqual(participants, [
    { id: 4, nickname: "72기 김서강" },
    { id: 7, nickname: "73기 이서강" },
  ]);
  assert.deepEqual(participants.map(formatActivityParticipant), ["72기 김서강", "73기 이서강"]);
});

test("사용자 ID가 없는 기존 참가자도 수정 화면에서 제거 가능한 임시 칩으로 복원한다", () => {
  assert.deepEqual(activityParticipantsFromMetadata({ participants: "김서강, 이서강" }), [
    { id: -1, nickname: "김서강" },
    { id: -2, nickname: "이서강" },
  ]);
});

test("활동인증 수정 metadata는 날짜·참가자·소스 글을 갱신하고 유효한 참가자 ID만 저장한다", () => {
  const metadata = buildActivityCertificationMetadata({
    existingMetadata: {
      activity_date: "2026.07.01",
      participants: "기존 참가자",
      participant_user_ids: "2,3",
      activity_source_post_id: "9",
      bank_account: "서강은행 123",
      custom_key: "keep",
    },
    activityDate: "2026.08.15",
    participants: "72기 김서강, 기존 참가자",
    bankAccount: "",
    selectedParticipants: [
      { id: 4, nickname: "김서강", cohort: "72" },
      { id: -1, nickname: "기존 참가자" },
    ],
    activitySourcePostId: 10,
  });

  assert.deepEqual(metadata, {
    activity_date: "2026.08.15",
    participants: "72기 김서강, 기존 참가자",
    participant_user_ids: "4,",
    activity_source_post_id: "10",
    bank_account: "서강은행 123",
    custom_key: "keep",
  });
  assert.equal(activitySourcePostIdFromMetadata(metadata), 10);
});

test("ID 없는 기존 참가자 뒤에 새 참가자를 추가해도 이름과 ID 위치가 뒤바뀌지 않는다", () => {
  const metadata = buildActivityCertificationMetadata({
    existingMetadata: { participants: "기존 참가자" },
    activityDate: "2026.08.15",
    participants: "기존 참가자, 72기 김서강",
    bankAccount: "",
    selectedParticipants: [
      { id: -1, nickname: "기존 참가자" },
      { id: 7, nickname: "김서강", cohort: "72" },
    ],
    activitySourcePostId: 10,
  });

  assert.equal(metadata.participant_user_ids, ",7");
  assert.deepEqual(activityParticipantsFromMetadata(metadata), [
    { id: -1, nickname: "기존 참가자" },
    { id: 7, nickname: "72기 김서강" },
  ]);
});

test("잘못된 활동 소스 ID는 수정 초기값으로 사용하지 않는다", () => {
  assert.equal(activitySourcePostIdFromMetadata({ activity_source_post_id: "0" }), null);
  assert.equal(activitySourcePostIdFromMetadata({ activity_source_post_id: "not-a-number" }), null);
  assert.equal(activitySourcePostIdFromMetadata(undefined), null);
});
