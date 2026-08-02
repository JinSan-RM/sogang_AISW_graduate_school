export const DEFAULT_API_BASE_URL = "http://localhost:8000/api";
export const DEFAULT_AUTH_EMAIL_TIMEOUT_MS = 120_000;
export const MIN_AUTH_EMAIL_TIMEOUT_MS = 15_000;
export const MAX_AUTH_EMAIL_TIMEOUT_MS = 120_000;
export const DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS = 120_000;
export const MIN_MEDIA_UPLOAD_TIMEOUT_MS = 30_000;
export const MAX_MEDIA_UPLOAD_TIMEOUT_MS = 600_000;

type ApiBaseUrlOptions = {
  configuredUrl?: string;
  platform: string;
  expoHostUri?: string | null;
  isDevelopment?: boolean;
};

function hostFromExpoUri(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  try {
    const url = new URL(
      normalized.includes("://") ? normalized : `http://${normalized}`,
    );
    return url.hostname.replace(/^\[|\]$/g, "") || null;
  } catch {
    return null;
  }
}

function hostForUrl(host: string): string {
  return host.includes(":") ? `[${host}]` : host;
}

function isPublicHttpsApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const privateIpv4 =
      /^(?:10|127)\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname);
    const privateIpv6 =
      hostname === "::" ||
      hostname === "::1" ||
      /^(?:fc|fd)/.test(hostname) ||
      /^fe[89ab]/.test(hostname);
    const temporaryCloudflareHostname =
      hostname === "trycloudflare.com" || hostname.endsWith(".trycloudflare.com");

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname.replace(/\/+$/, "").endsWith("/api") &&
      !["localhost", "0.0.0.0", "example.com"].includes(hostname) &&
      ![".local", ".localhost", ".internal", ".invalid", ".example", ".test"].some(
        (suffix) => hostname.endsWith(suffix),
      ) &&
      !privateIpv4 &&
      !privateIpv6 &&
      !temporaryCloudflareHostname
    );
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl({
  configuredUrl,
  platform,
  expoHostUri,
  isDevelopment = false,
}: ApiBaseUrlOptions): string {
  const explicitUrl = configuredUrl?.trim();
  if (explicitUrl) {
    if (!isDevelopment && !isPublicHttpsApiUrl(explicitUrl)) {
      throw new Error(
        "EXPO_PUBLIC_API_URL must be a stable public HTTPS URL ending in /api outside development builds.",
      );
    }
    return explicitUrl;
  }

  if (isDevelopment && platform !== "web") {
    const host = hostFromExpoUri(expoHostUri);
    if (host) return `http://${hostForUrl(host)}:8000/api`;
  }

  if (isDevelopment) return DEFAULT_API_BASE_URL;

  throw new Error("EXPO_PUBLIC_API_URL is required outside development builds.");
}

export function resolveAuthEmailTimeoutMs(configuredValue?: string): number {
  const normalized = configuredValue?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) {
    return DEFAULT_AUTH_EMAIL_TIMEOUT_MS;
  }

  const parsed = Number(normalized);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < MIN_AUTH_EMAIL_TIMEOUT_MS ||
    parsed > MAX_AUTH_EMAIL_TIMEOUT_MS
  ) {
    return DEFAULT_AUTH_EMAIL_TIMEOUT_MS;
  }

  return parsed;
}

export function resolveMediaUploadTimeoutMs(
  configuredValue?: string,
): number {
  const normalized = configuredValue?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) {
    return DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS;
  }

  const parsed = Number(normalized);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < MIN_MEDIA_UPLOAD_TIMEOUT_MS ||
    parsed > MAX_MEDIA_UPLOAD_TIMEOUT_MS
  ) {
    return DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS;
  }

  return parsed;
}

export function shouldRetryWithCurrentAccessToken(
  requestAuthorization: unknown,
  currentAccessToken?: string | null,
): boolean {
  if (typeof requestAuthorization !== "string" || !currentAccessToken) {
    return false;
  }

  const match = requestAuthorization.trim().match(/^Bearer\s+(.+)$/i);
  return Boolean(match?.[1] && match[1] !== currentAccessToken);
}

export function createKeyedSingleFlight<Key, Result>(
  operation: (key: Key) => Promise<Result>,
): (key: Key) => Promise<Result> {
  const inFlight = new Map<Key, Promise<Result>>();

  return (key: Key) => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    let tracked: Promise<Result>;
    tracked = Promise.resolve()
      .then(() => operation(key))
      .finally(() => {
        if (inFlight.get(key) === tracked) {
          inFlight.delete(key);
        }
      });
    inFlight.set(key, tracked);
    return tracked;
  };
}
