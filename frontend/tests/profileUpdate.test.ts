import assert from "node:assert/strict";
import test from "node:test";

import { buildProfileUpdatePayload } from "../utils/profileUpdate";

const currentProfile = {
  major: "Legacy Major",
  phone: "01012345678",
  profile_image_url: "/api/media/1/access-url",
};

test("an image-only profile change does not resubmit unchanged legacy fields", () => {
  assert.deepEqual(
    buildProfileUpdatePayload(currentProfile, {
      major: "Legacy Major",
      phone: "01012345678",
      profile_image_url: "/api/media/2/access-url",
    }),
    { profile_image_url: "/api/media/2/access-url" }
  );
});

test("profile image removal is sent explicitly as null", () => {
  assert.deepEqual(
    buildProfileUpdatePayload(currentProfile, {
      major: "Legacy Major",
      phone: "01012345678",
      profile_image_url: null,
    }),
    { profile_image_url: null }
  );
});

test("only changed editable profile fields are included", () => {
  assert.deepEqual(
    buildProfileUpdatePayload(currentProfile, {
      major: "AI-SW",
      phone: "01087654321",
      profile_image_url: "/api/media/1/access-url",
    }),
    { major: "AI-SW", phone: "01087654321" }
  );
  assert.deepEqual(
    buildProfileUpdatePayload(currentProfile, {
      major: "Legacy Major",
      phone: "01012345678",
      profile_image_url: "/api/media/1/access-url",
    }),
    {}
  );
});
