import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_API_BASE_URL,
  DEFAULT_AUTH_EMAIL_TIMEOUT_MS,
  DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS,
  createKeyedSingleFlight,
  resolveApiBaseUrl,
  resolveAuthEmailTimeoutMs,
  resolveMediaUploadTimeoutMs,
  shouldRetryWithCurrentAccessToken,
} from "../utils/apiRuntime";

test("explicit API URL wins while development keeps Expo LAN discovery", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredUrl: "  https://api.aisw.example/api  ",
      platform: "android",
      expoHostUri: "192.168.0.25:8081",
      isDevelopment: true,
    }),
    "https://api.aisw.example/api",
  );
  assert.equal(
    resolveApiBaseUrl({
      platform: "android",
      expoHostUri: "192.168.0.25:8081",
      isDevelopment: true,
    }),
    "http://192.168.0.25:8000/api",
  );
  assert.equal(
    resolveApiBaseUrl({
      platform: "ios",
      expoHostUri: "exp://10.0.0.8:8081",
      isDevelopment: true,
    }),
    "http://10.0.0.8:8000/api",
  );
  assert.equal(
    resolveApiBaseUrl({
      platform: "web",
      expoHostUri: "192.168.0.25:8081",
      isDevelopment: true,
    }),
    DEFAULT_API_BASE_URL,
  );
});

test("non-development builds fail closed without a configured API URL", () => {
  assert.throws(
    () =>
      resolveApiBaseUrl({
        platform: "android",
        expoHostUri: "192.168.0.25:8081",
        isDevelopment: false,
      }),
    /EXPO_PUBLIC_API_URL is required/,
  );

  for (const configuredUrl of [
    "http://api.aisw-connect.kr/api",
    "https://localhost/api",
    "https://192.168.0.20/api",
    "https://temporary.trycloudflare.com/api",
    "https://api.aisw-connect.kr/v1",
  ]) {
    assert.throws(
      () =>
        resolveApiBaseUrl({
          configuredUrl,
          platform: "android",
          isDevelopment: false,
        }),
      /stable public HTTPS URL ending in \/api/,
    );
  }

  assert.equal(
    resolveApiBaseUrl({
      configuredUrl: "https://api.aisw-connect.kr/api",
      platform: "android",
      isDevelopment: false,
    }),
    "https://api.aisw-connect.kr/api",
  );
});

test("authentication email timeout is bounded for remote SMTP delivery", () => {
  assert.equal(resolveAuthEmailTimeoutMs(undefined), DEFAULT_AUTH_EMAIL_TIMEOUT_MS);
  assert.equal(resolveAuthEmailTimeoutMs("10000"), DEFAULT_AUTH_EMAIL_TIMEOUT_MS);
  assert.equal(resolveAuthEmailTimeoutMs("150000"), DEFAULT_AUTH_EMAIL_TIMEOUT_MS);
  assert.equal(resolveAuthEmailTimeoutMs("45000"), 45_000);
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
