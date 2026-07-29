import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const easBuildProfile = process.env.EAS_BUILD_PROFILE?.trim().toLowerCase() ?? "";
const strict = process.argv.includes("--strict") || easBuildProfile === "production";
const requiresPublicApiUrl = easBuildProfile === "preview" || easBuildProfile === "production";
const ci = process.argv.includes("--ci");
const errors = [];
const remoteApiErrors = [];
const warnings = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readTextIfExists(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function resolveProjectFile(relativePath) {
  return typeof relativePath === "string" && relativePath.length > 0
    ? path.resolve(projectRoot, relativePath)
    : null;
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function isPublicHttpsUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const isPrivateIpv4 =
      /^(?:10|127)\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname);
    const isPrivateIpv6 =
      hostname === "::" ||
      hostname === "::1" ||
      /^(?:fc|fd)/.test(hostname) ||
      /^fe[89ab]/.test(hostname);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !["localhost", "0.0.0.0", "example.com"].includes(hostname) &&
      ![".local", ".localhost", ".internal", ".invalid", ".example", ".test"].some((suffix) =>
        hostname.endsWith(suffix),
      ) &&
      !isPrivateIpv4 &&
      !isPrivateIpv6
    );
  } catch {
    return false;
  }
}

function isProductionEmail(value) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const domain = parts[1];
  return (
    !/(replace-with|change-me|placeholder)/.test(normalized) &&
    !["localhost", "example.com"].includes(domain) &&
    ![".local", ".localhost", ".invalid", ".example", ".test"].some((suffix) =>
      domain.endsWith(suffix),
    )
  );
}

function extractQuotedValue(source, pattern) {
  const match = source.match(pattern);
  return match?.[1] ?? null;
}

const appJson = readJson("app.json");
const easJson = readJson("eas.json");
const expo = appJson.expo ?? {};
const android = expo.android ?? {};
const ios = expo.ios ?? {};
const production = easJson.build?.production ?? {};
const nativeGradle = readText("android/app/build.gradle");
const nativeManifest = readText("android/app/src/main/AndroidManifest.xml");
const nativePackageDirectory = (android.package ?? "").replaceAll(".", "/");
const mainActivity = readTextIfExists(`android/app/src/main/java/${nativePackageDirectory}/MainActivity.kt`);
const mainApplication = readTextIfExists(`android/app/src/main/java/${nativePackageDirectory}/MainApplication.kt`);

const placeholderPattern = /(^|\.)(anonymous|example|placeholder|change-me)(\.|$)/i;
check(expo.name && expo.slug && expo.owner && expo.scheme, "App name, slug, owner, and scheme must be configured.");
check(
  typeof expo.extra?.eas?.projectId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      expo.extra.eas.projectId,
    ),
  "A valid EAS projectId must be configured.",
);
check(expo.version && /^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/.test(expo.version), "expo.version must be an explicit release version.");
check(
  android.package && !placeholderPattern.test(android.package),
  "android.package must be the approved permanent application ID, not a placeholder.",
);
check(
  ios.bundleIdentifier && !placeholderPattern.test(ios.bundleIdentifier),
  "ios.bundleIdentifier must be the approved permanent bundle ID, not a placeholder.",
);
check(Number.isInteger(android.versionCode) && android.versionCode > 0, "android.versionCode must be a positive integer.");
check(typeof ios.buildNumber === "string" && /^\d+(\.\d+){0,2}$/.test(ios.buildNumber), "ios.buildNumber must use Apple's numeric format.");

const blockedPermissions = new Set(android.blockedPermissions ?? []);
for (const permission of [
  "android.permission.CAMERA",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
]) {
  check(blockedPermissions.has(permission), `${permission} must be blocked for production.`);
}

const privacyReasons = new Map(
  (ios.privacyManifests?.NSPrivacyAccessedAPITypes ?? []).map((item) => [
    item.NSPrivacyAccessedAPIType,
    new Set(item.NSPrivacyAccessedAPITypeReasons ?? []),
  ]),
);
for (const [category, reason] of [
  ["NSPrivacyAccessedAPICategoryFileTimestamp", "C617.1"],
  ["NSPrivacyAccessedAPICategorySystemBootTime", "35F9.1"],
  ["NSPrivacyAccessedAPICategoryUserDefaults", "CA92.1"],
]) {
  check(privacyReasons.get(category)?.has(reason), `iOS privacy manifest is missing ${category}/${reason}.`);
}
check(ios.privacyManifests?.NSPrivacyTracking === false, "iOS privacy manifest must explicitly disable tracking when the app does not track.");
check(ios.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads === false, "iOS arbitrary network loads must stay disabled.");
check(
  ios.infoPlist?.NSAppTransportSecurity?.NSAllowsLocalNetworking !== true &&
    !ios.infoPlist?.NSLocalNetworkUsageDescription,
  "Production iOS config must not contain local-network exceptions or test-server permission copy.",
);

check(easJson.cli?.appVersionSource === "remote", "EAS appVersionSource must be remote for monotonic store build numbers.");
check(easJson.cli?.requireCommit === true, "EAS must require a clean Git commit before a release build.");
check(production.environment === "production", "The EAS production profile must use the production environment.");
check(production.credentialsSource === "remote", "The EAS production profile must use organization-managed remote credentials.");
check(production.autoIncrement === true, "The EAS production profile must auto-increment build versions.");
check(production.android?.buildType === "app-bundle", "The Android production build must produce an AAB.");

const nativeApplicationId = extractQuotedValue(nativeGradle, /applicationId\s+['"]([^'"]+)['"]/);
const nativeNamespace = extractQuotedValue(nativeGradle, /namespace\s+['"]([^'"]+)['"]/);
const nativeVersionCode = Number(extractQuotedValue(nativeGradle, /versionCode\s+(\d+)/));
const nativeVersionName = extractQuotedValue(nativeGradle, /versionName\s+['"]([^'"]+)['"]/);
check(nativeApplicationId === android.package, "Native Android applicationId must match app.json android.package.");
check(nativeNamespace === android.package, "Native Android namespace must match app.json android.package.");
check(nativeVersionCode === android.versionCode, "Native Android versionCode must match app.json.");
check(nativeVersionName === expo.version, "Native Android versionName must match expo.version.");
check(
  new RegExp(`^package\\s+${(android.package ?? "").replaceAll(".", "\\.")}$`, "m").test(mainActivity) &&
    new RegExp(`^package\\s+${(android.package ?? "").replaceAll(".", "\\.")}$`, "m").test(mainApplication),
  "Native MainActivity/MainApplication package declarations must match android.package.",
);
check(/android:usesCleartextTraffic="false"/.test(nativeManifest), "The release Android manifest must disable cleartext traffic.");
check(/android:allowBackup="false"/.test(nativeManifest), "The release Android manifest must disable platform backup for member data.");
for (const permission of [
  "android.permission.CAMERA",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.SYSTEM_ALERT_WINDOW",
]) {
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  check(
    new RegExp(`android:name="${escaped}"[^>]*tools:node="remove"`).test(nativeManifest),
    `The native release manifest must remove ${permission}.`,
  );
}
check(
  /com\.google\.firebase\.messaging\.default_notification_channel_id/.test(nativeManifest),
  "The native manifest must define the default Android notification channel.",
);
check(
  /expo\.modules\.notifications\.default_notification_color/.test(nativeManifest),
  "The native manifest must define the notification color.",
);
check(
  /com\.google\.gms:google-services:4\.5\.0/.test(readText("android/build.gradle")) &&
    /apply plugin: "com\.google\.gms\.google-services"/.test(nativeGradle),
  "The native Android project must configure the Google Services Gradle plugin.",
);

for (const [label, asset] of [
  ["approved 1024x1024 app icon", expo.icon],
  ["approved Android adaptive icon foreground", android.adaptiveIcon?.foregroundImage],
  ["approved Android monochrome icon", android.adaptiveIcon?.monochromeImage],
]) {
  const resolved = resolveProjectFile(asset);
  check(Boolean(resolved && fs.existsSync(resolved) && fs.statSync(resolved).isFile()), `An ${label} file must be configured and exist.`);
}
check(
  Array.isArray(expo.plugins) && expo.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen"),
  "An approved splash asset must be configured through expo-splash-screen.",
);
const splashPlugin = expo.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen");
const splashAsset = resolveProjectFile(Array.isArray(splashPlugin) ? splashPlugin[1]?.image : null);
check(Boolean(splashAsset && fs.existsSync(splashAsset)), "The approved splash image file must exist.");

if (strict || ci) {
  const googleServicesPath = path.join(projectRoot, "android", "app", "google-services.json");
  check(fs.existsSync(googleServicesPath), "Production Android builds require injected google-services.json.");
  if (fs.existsSync(googleServicesPath)) {
    try {
      const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, "utf8"));
      const packageNames = (googleServices.client ?? [])
        .map((client) => client?.client_info?.android_client_info?.package_name)
        .filter(Boolean);
      check(packageNames.includes(android.package), "google-services.json must contain the approved Android package.");
    } catch {
      check(false, "google-services.json must be valid JSON.");
    }
  }
}

const apiUrlChecks = [
  [
    isPublicHttpsUrl(process.env.EXPO_PUBLIC_API_URL),
    "EXPO_PUBLIC_API_URL must be a public HTTPS URL in the selected EAS environment.",
  ],
  [
    typeof process.env.EXPO_PUBLIC_API_URL === "string" &&
      process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "").endsWith("/api"),
    "EXPO_PUBLIC_API_URL must end with /api.",
  ],
];
for (const [condition, message] of apiUrlChecks) {
  check(condition, message);
  if (requiresPublicApiUrl && !condition) {
    remoteApiErrors.push(message);
  }
}

for (const [name, value] of [
  ["EXPO_PUBLIC_SUPPORT_URL", process.env.EXPO_PUBLIC_SUPPORT_URL],
  ["EXPO_PUBLIC_PRIVACY_POLICY_URL", process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL],
  ["EXPO_PUBLIC_ACCOUNT_DELETION_URL", process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL],
]) {
  check(isPublicHttpsUrl(value), `${name} must be a public HTTPS URL in the selected EAS environment.`);
}
const publicPolicyUrls = [
  process.env.EXPO_PUBLIC_SUPPORT_URL,
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL,
].filter(Boolean);
check(
  new Set(publicPolicyUrls).size === 3,
  "Support, privacy, and account-deletion URLs must be three distinct public resources.",
);
check(
  isProductionEmail(process.env.EXPO_PUBLIC_SUPPORT_EMAIL),
  "EXPO_PUBLIC_SUPPORT_EMAIL must be a monitored non-placeholder email address.",
);
check(
  typeof process.env.EXPO_PUBLIC_OPERATOR_NAME === "string" &&
    process.env.EXPO_PUBLIC_OPERATOR_NAME.trim().length >= 2 &&
    !/(replace-with|change-me|placeholder|승인 필요)/i.test(process.env.EXPO_PUBLIC_OPERATOR_NAME),
  "EXPO_PUBLIC_OPERATOR_NAME must identify the approved service operator.",
);
check(
  /^\d{4}-\d{2}-\d{2}$/.test(process.env.EXPO_PUBLIC_PRIVACY_EFFECTIVE_DATE ?? ""),
  "EXPO_PUBLIC_PRIVACY_EFFECTIVE_DATE must use YYYY-MM-DD.",
);
check(
  typeof process.env.EXPO_PUBLIC_PRIVACY_POLICY_VERSION === "string" &&
    /^[0-9A-Za-z][0-9A-Za-z._-]{0,49}$/.test(process.env.EXPO_PUBLIC_PRIVACY_POLICY_VERSION),
  "EXPO_PUBLIC_PRIVACY_POLICY_VERSION must be explicitly configured.",
);

if (ci) {
  const acceptedExternalBlockers = [
    /approved permanent application ID/,
    /approved permanent bundle ID/,
    /approved 1024x1024 app icon/,
    /approved Android adaptive icon foreground/,
    /approved Android monochrome icon/,
    /approved splash asset/,
    /approved splash image/,
    /injected google-services\.json/,
    /EXPO_PUBLIC_/,
    /Support, privacy, and account-deletion URLs/,
  ];
  const unexpectedErrors = errors.filter(
    (message) => !acceptedExternalBlockers.some((pattern) => pattern.test(message)),
  );
  if (unexpectedErrors.length > 0) {
    console.error(
      `Unexpected release configuration errors:\n${unexpectedErrors
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
    process.exit(1);
  }
  console.log(
    `Static release configuration checks passed; ${errors.length} approved external-input blockers remain.`,
  );
  process.exit(0);
}

if (strict && errors.length > 0) {
  console.error(`Release configuration failed:\n${errors.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}

if (remoteApiErrors.length > 0) {
  console.error(
    `EAS ${easBuildProfile} API configuration failed:\n${remoteApiErrors
      .map((item) => `- ${item}`)
      .join("\n")}`,
  );
  process.exit(1);
}

if (errors.length > 0) {
  console.error(`Release configuration is incomplete:\n${errors.map((item) => `- ${item}`).join("\n")}`);
  warnings.push(...errors);
}

if (!strict && warnings.length > 0) {
  console.warn("Non-production build allowed; production EAS builds will fail until every item above is resolved.");
} else {
  console.log("Release configuration checks passed.");
}
