import assert from "node:assert/strict";
import test from "node:test";

import { isAdminUser } from "../utils/permissions";

test("admin routes are visible only to administrators", () => {
  assert.equal(isAdminUser({ role: "admin" }), true);
  assert.equal(isAdminUser({ role: "user" }), false);
  assert.equal(isAdminUser({ role: "guest" }), false);
  assert.equal(isAdminUser(null), false);
});
