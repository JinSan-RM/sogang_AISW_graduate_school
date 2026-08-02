import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPastCouncilActivitiesForEditing,
  parsePastCouncilActivitiesForStorage,
  pastCouncilActivitiesFromMetadata,
} from "../utils/pastCouncil";

test("구조화된 역대 원우회 활동 날짜를 관리자 입력란에 보존한다", () => {
  const metadata = [
    { date: "25.05.05(금)", title: "원우회 이임식" },
    { date: "2024.10.18", title: "가을 체육대회" },
  ];

  assert.equal(
    formatPastCouncilActivitiesForEditing(metadata),
    "25.05.05(금) 원우회 이임식\n2024.10.18 가을 체육대회",
  );
});

test("관리자 입력의 날짜 접두어를 구조화해 다시 저장한다", () => {
  assert.deepEqual(
    parsePastCouncilActivitiesForStorage("25.05.05(금) 원우회 이임식\n2024.10.18 가을 체육대회\n날짜 없는 활동"),
    [
      { date: "25.05.05(금)", title: "원우회 이임식" },
      { date: "2024.10.18", title: "가을 체육대회" },
      "날짜 없는 활동",
    ],
  );
});

test("기존 문자열 활동의 날짜 접두어도 사용자 화면에서 복구한다", () => {
  assert.deepEqual(pastCouncilActivitiesFromMetadata(["25.05.05 기말 세미나", "신입생 환영회"]), [
    { date: "25.05.05", title: "기말 세미나" },
    { title: "신입생 환영회" },
  ]);
});
