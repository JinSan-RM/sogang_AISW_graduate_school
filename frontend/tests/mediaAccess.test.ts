import assert from "node:assert/strict";
import test from "node:test";

import {
  isManagedUploadUrl,
  managedMediaPathFromReference,
  mediaIdFromReference,
  mediaAccessEndpoint,
  shouldRequestMediaAccess,
  toAbsoluteMediaUrl,
} from "../utils/mediaAccess";

test("normalizes local media paths without rewriting direct browser URIs", () => {
  assert.equal(toAbsoluteMediaUrl("/uploads/photo.jpg", "https://api.example.com"), "https://api.example.com/uploads/photo.jpg");
  assert.equal(toAbsoluteMediaUrl("uploads/photo.jpg", "https://api.example.com"), "https://api.example.com/uploads/photo.jpg");
  assert.equal(toAbsoluteMediaUrl("https://cdn.example.com/photo.jpg", "https://api.example.com"), "https://cdn.example.com/photo.jpg");
  assert.equal(toAbsoluteMediaUrl("blob:test", "https://api.example.com"), "blob:test");
  assert.equal(toAbsoluteMediaUrl(null, "https://api.example.com"), null);
});

test("requests a signed URL for application-managed media", () => {
  assert.equal(isManagedUploadUrl("/uploads/photo.jpg"), true);
  assert.equal(isManagedUploadUrl("https://api.example.com/uploads/photo.jpg"), true);
  assert.equal(isManagedUploadUrl("/api/media/7/access-url"), true);
  assert.equal(shouldRequestMediaAccess({ id: 7, url: "/uploads/photo.jpg" }), true);
  assert.equal(shouldRequestMediaAccess({ id: 7, url: null, is_private: true }), true);
  assert.equal(shouldRequestMediaAccess({ id: 7, url: "https://cdn.example.com/photo.jpg" }), false);
  assert.equal(shouldRequestMediaAccess({ url: "/uploads/photo.jpg" }), true);
  assert.equal(managedMediaPathFromReference("https://api.example.com/uploads/photo.jpg"), "/uploads/photo.jpg");
  assert.equal(managedMediaPathFromReference("uploads/photo.jpg"), "/uploads/photo.jpg");
  assert.equal(managedMediaPathFromReference("/uploads/photo.jpg?legacy=1#preview"), "/uploads/photo.jpg");
  assert.equal(managedMediaPathFromReference("/api/media/7/access-url"), "/api/media/7/access-url");
  assert.equal(managedMediaPathFromReference("/uploads/../secret.txt"), null);
  assert.equal(mediaIdFromReference({ url: "/api/media/7/access-url" }), 7);
  assert.equal(shouldRequestMediaAccess({ url: "/api/media/7/access-url" }), true);
  assert.equal(mediaAccessEndpoint(7), "/media/7/access-url");
  assert.throws(() => mediaAccessEndpoint(0));
});
