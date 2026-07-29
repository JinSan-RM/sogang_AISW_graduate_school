export const DEFAULT_API_BASE_URL = "http://localhost:8000/api";
export const DEFAULT_MEDIA_UPLOAD_TIMEOUT_MS = 120_000;
export const MIN_MEDIA_UPLOAD_TIMEOUT_MS = 30_000;
export const MAX_MEDIA_UPLOAD_TIMEOUT_MS = 600_000;

type ApiBaseUrlOptions = {
  configuredUrl?: string;
  platform: string;
  expoHostUri?: string | null;
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

export function resolveApiBaseUrl({
  configuredUrl,
  platform,
  expoHostUri,
}: ApiBaseUrlOptions): string {
  const explicitUrl = configuredUrl?.trim();
  if (explicitUrl) return explicitUrl;

  if (platform !== "web") {
    const host = hostFromExpoUri(expoHostUri);
    if (host) return `http://${hostForUrl(host)}:8000/api`;
  }

  return DEFAULT_API_BASE_URL;
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
