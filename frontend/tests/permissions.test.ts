import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isAdminUser } from "../utils/permissions";

test("admin routes and council request management are visible only to administrators", () => {
  assert.equal(isAdminUser({ role: "admin" }), true);
  assert.equal(isAdminUser({ role: "user" }), false);
  assert.equal(isAdminUser({ role: "guest" }), false);
  assert.equal(isAdminUser(undefined), false);
  assert.equal(isAdminUser(null), false);
});

test("protected routes fall back to login for guests and home for signed-in members", () => {
  const rootLayoutSource = readFileSync("app/_layout.tsx", "utf8");
  const guestRoutes = rootLayoutSource.indexOf("guard={!isAuthenticated}");
  const memberRoutes = rootLayoutSource.indexOf("guard={isAuthenticated}");
  const adminRoutes = rootLayoutSource.indexOf("guard={isAdmin}");
  const publicLegalRoutes = rootLayoutSource.indexOf('name="legal/terms"');

  assert.ok(guestRoutes >= 0, "guest auth routes must be declared");
  assert.ok(memberRoutes > guestRoutes, "member routes must follow the guest login anchor");
  assert.ok(adminRoutes > memberRoutes, "admin routes must remain role-protected");
  assert.ok(publicLegalRoutes > adminRoutes, "public legal routes must not become the protected-route fallback");
});
