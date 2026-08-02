import assert from "node:assert/strict";
import test from "node:test";

import { createFormNotice, requiredFieldNotice } from "../utils/formNotice";

test("필수값 누락 시 웹과 네이티브 공통 안내 모달 데이터를 만든다", () => {
  assert.deepEqual(requiredFieldNotice("경조사 종류"), {
    title: "필수 항목",
    message: "경조사 종류 항목을 입력하세요.",
  });
});

test("서버 및 첨부 오류도 동일한 안내 모달 형식으로 표시한다", () => {
  assert.deepEqual(createFormNotice("증빙서류", "증빙서류를 첨부하세요."), {
    title: "증빙서류",
    message: "증빙서류를 첨부하세요.",
  });
});
