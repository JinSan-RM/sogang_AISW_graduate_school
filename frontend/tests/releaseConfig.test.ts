import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDirectory, "..");
const validatorPath = path.join(
  frontendRoot,
  "scripts",
  "validate-release-config.mjs",
);

function runValidator(profile: string, apiUrl?: string, authEmailTimeout = "120000") {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    EAS_BUILD_PROFILE: profile,
    EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS: authEmailTimeout,
  };
  if (apiUrl === undefined) {
    delete env.EXPO_PUBLIC_API_URL;
  } else {
    env.EXPO_PUBLIC_API_URL = apiUrl;
  }

  const result = spawnSync(process.execPath, [validatorPath], {
    cwd: frontendRoot,
    encoding: "utf8",
    env,
  });
  assert.equal(result.error, undefined);
  return {
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
  };
}

test("EAS preview fails when the API URL is missing or not public HTTPS", () => {
  for (const apiUrl of [
    undefined,
    "http://203.0.113.10:8000/api",
    "https://localhost/api",
    "https://192.168.0.20/api",
    "https://api.internal/api",
    "https://random-name.trycloudflare.com/api",
  ]) {
    const result = runValidator("preview", apiUrl);
    assert.notEqual(result.status, 0, `preview unexpectedly accepted ${apiUrl ?? "a missing URL"}`);
    assert.match(result.output, /EAS preview API configuration failed/);
    assert.match(result.output, /EXPO_PUBLIC_API_URL must be a public HTTPS URL/);
  }
});

test("EAS preview accepts a public HTTPS API URL ending in /api", () => {
  const result = runValidator(
    "preview",
    "https://api.aisw-connect.kr/api",
  );
  assert.equal(result.status, 0, result.output);
  assert.doesNotMatch(result.output, /EAS preview API configuration failed/);
});

test("EAS preview rejects a public HTTPS URL with the wrong API base path", () => {
  for (const apiUrl of [
    "https://api.aisw-connect.kr/v1",
    "https://api.aisw-connect.kr/api?next=/api",
    "https://api.aisw-connect.kr/api#/api",
  ]) {
    const result = runValidator("preview", apiUrl);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /EXPO_PUBLIC_API_URL must/);
  }
});

test("EAS preview rejects an invalid authentication email timeout", () => {
  const result = runValidator(
    "preview",
    "https://api.aisw-connect.kr/api",
    "10000",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.output, /EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS must be an integer/);
});

test("EAS production includes invalid API URL errors in the strict release failure", () => {
  const result = runValidator("production", "http://203.0.113.10:8000/api");
  assert.notEqual(result.status, 0);
  assert.match(result.output, /Release configuration failed/);
  assert.match(result.output, /EXPO_PUBLIC_API_URL must be a public HTTPS URL/);
});

test("development keeps local API fallback as a non-blocking configuration", () => {
  const result = runValidator("development");
  assert.equal(result.status, 0, result.output);
  assert.doesNotMatch(result.output, /EAS development API configuration failed/);
});
