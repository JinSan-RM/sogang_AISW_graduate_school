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
