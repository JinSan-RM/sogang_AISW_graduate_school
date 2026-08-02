import assert from "node:assert/strict";
import test from "node:test";

import { selectAndUploadProfileImage } from "../utils/profileImagePicker";

test("web profile images upload the browser File without converting it to a native object", async () => {
  const selectedFile = new File(["avatar"], "avatar.png", { type: "image/png" });
  let uploaded: File | { uri: string; name: string; type: string } | null = null;

  const result = await selectAndUploadProfileImage({
    platform: "web",
    pickWebFile: async () => selectedFile,
    requestNativePermission: async () => {
      throw new Error("native permission must not run on web");
    },
    pickNativeImage: async () => {
      throw new Error("native picker must not run on web");
    },
    upload: async (file) => {
      uploaded = file;
      return { id: 7 };
    },
  });

  assert.strictEqual(uploaded, selectedFile);
  assert.deepEqual(result, { id: 7 });
});

test("native profile images upload the React Native file descriptor", async () => {
  let uploaded: File | { uri: string; name: string; type: string } | null = null;

  const result = await selectAndUploadProfileImage({
    platform: "android",
    pickWebFile: async () => {
      throw new Error("web picker must not run on native");
    },
    requestNativePermission: async () => true,
    pickNativeImage: async () => ({
      uri: "file:///cache/avatar.jpg",
      fileName: null,
      mimeType: "image/jpeg",
    }),
    upload: async (file) => {
      uploaded = file;
      return { id: 8 };
    },
  });

  assert.deepEqual(uploaded, {
    uri: "file:///cache/avatar.jpg",
    name: "avatar.jpg",
    type: "image/jpeg",
  });
  assert.deepEqual(result, { id: 8 });
});

test("profile image cancellation does not upload a file", async () => {
  let uploadCalls = 0;

  const result = await selectAndUploadProfileImage({
    platform: "web",
    pickWebFile: async () => null,
    requestNativePermission: async () => true,
    pickNativeImage: async () => null,
    upload: async () => {
      uploadCalls += 1;
      return { id: 9 };
    },
  });

  assert.equal(result, null);
  assert.equal(uploadCalls, 0);
});

test("native profile image selection requires media-library permission", async () => {
  await assert.rejects(
    () =>
      selectAndUploadProfileImage({
        platform: "ios",
        pickWebFile: async () => null,
        requestNativePermission: async () => false,
        pickNativeImage: async () => null,
        upload: async () => ({ id: 10 }),
      }),
    /MEDIA_PERMISSION_DENIED/
  );
});
