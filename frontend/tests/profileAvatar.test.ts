import assert from "node:assert/strict";
import test from "node:test";

import { profileAvatarPresentation } from "../utils/profileAvatar";

test("프로필 이미지 식별자가 있으면 이미지 표현을 선택한다", () => {
  assert.deepEqual(profileAvatarPresentation(81, null), {
    kind: "image",
    media: { id: 81, url: null },
  });
});

test("프로필 이미지 URL만 있어도 이미지 표현을 선택한다", () => {
  assert.deepEqual(profileAvatarPresentation(null, "/uploads/profile.png"), {
    kind: "image",
    media: { id: null, url: "/uploads/profile.png" },
  });
});

test("프로필 이미지가 없으면 닉네임과 무관하게 기본 표현을 선택한다", () => {
  assert.deepEqual(profileAvatarPresentation(null, null), { kind: "default" });
});

test("프로필 이미지 URL은 공백을 제거해 정규화한다", () => {
  assert.deepEqual(profileAvatarPresentation(null, "  /uploads/profile.png  "), {
    kind: "image",
    media: { id: null, url: "/uploads/profile.png" },
  });
});

test("빈 URL과 유효하지 않은 이미지 식별자는 기본 표현을 선택한다", () => {
  for (const mediaId of [0, -1, 1.2, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(profileAvatarPresentation(mediaId, "   "), { kind: "default" });
  }
});
