import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_API_BASE_URL,
  DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS,
  createKeyedSingleFlight,
  resolveApiBaseUrl,
  resolveMediaUploadTimeoutMs,
  shouldRetryWithCurrentAccessToken,
} from "../utils/apiRuntime";

test("explicit API URL wins while development keeps Expo LAN discovery", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredUrl: "  https://api.aisw.example/api  ",
      platform: "android",
      expoHostUri: "192.168.0.25:8081",
    }),
    "https://api.aisw.example/api",
  );
  assert.equal(
    resolveApiBaseUrl({
      platform: "android",
      expoHostUri: "192.168.0.25:8081",
    }),
    "http://192.168.0.25:8000/api",
  );
  assert.equal(
    resolveApiBaseUrl({
      platform: "ios",
      expoHostUri: "exp://10.0.0.8:8081",
    }),
    "http://10.0.0.8:8000/api",
  );
  assert.equal(
    resolveApiBaseUrl({
      platform: "web",
      expoHostUri: "192.168.0.25:8081",
    }),
    DEFAULT_API_BASE_URL,
  );
});

test("media upload timeout uses a bounded remote-network default", () => {
  assert.equal(resolveMediaUploadTimeoutMs(undefined), DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS);
  assert.equal(resolveMediaUploadTimeoutMs(""), DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS);
  assert.equal(resolveMediaUploadTimeoutMs("not-a-number"), DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS);
  assert.equal(resolveMediaUploadTimeoutMs("10000"), DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS);
  assert.equal(resolveMediaUploadTimeoutMs("900000"), DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS);
  assert.equal(resolveMediaUploadTimeoutMs("180000"), 180000);
});

test("refresh work is single-flight for the same rotating refresh token", async () => {
  let calls = 0;
  let completeRefresh!: (accessToken: string) => void;
  const refreshResult = new Promise<string>((resolve) => {
    completeRefresh = resolve;
  });
  const refreshOnce = createKeyedSingleFlight(async () => {
    calls += 1;
    return refreshResult;
  });

  const first = refreshOnce("refresh-token-v1");
  const second = refreshOnce("refresh-token-v1");
  const third = refreshOnce("refresh-token-v1");

  assert.strictEqual(first, second);
  assert.strictEqual(second, third);
  await Promise.resolve();
  assert.equal(calls, 1);

  completeRefresh("access-token-v2");
  assert.deepEqual(await Promise.all([first, second, third]), [
    "access-token-v2",
    "access-token-v2",
    "access-token-v2",
  ]);

  assert.equal(await refreshOnce("refresh-token-v1"), "access-token-v2");
  assert.equal(calls, 2);
});

test("failed refresh work is removed so a later request can retry", async () => {
  let calls = 0;
  const refreshOnce = createKeyedSingleFlight(async () => {
    calls += 1;
    if (calls === 1) throw new Error("temporary refresh failure");
    return "access-token-v2";
  });

  const first = refreshOnce("refresh-token-v1");
  const second = refreshOnce("refresh-token-v1");
  assert.strictEqual(first, second);
  await assert.rejects(first, /temporary refresh failure/);
  assert.equal(await refreshOnce("refresh-token-v1"), "access-token-v2");
  assert.equal(calls, 2);
});

test("late 401 responses retry the current access token without rotating refresh again", () => {
  assert.equal(
    shouldRetryWithCurrentAccessToken("Bearer access-token-v1", "access-token-v2"),
    true,
  );
  assert.equal(
    shouldRetryWithCurrentAccessToken("Bearer access-token-v2", "access-token-v2"),
    false,
  );
  assert.equal(shouldRetryWithCurrentAccessToken(undefined, "access-token-v2"), false);
});
