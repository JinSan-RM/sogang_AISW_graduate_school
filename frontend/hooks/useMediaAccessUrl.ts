import { useQuery } from "@tanstack/react-query";

import {
  mediaAccessQueryOptions as mediaAccessQueryPolicy,
  type MediaReference,
} from "../utils/mediaAccess";
import {
  managedMediaPathFromReference,
  mediaIdFromReference,
  shouldRequestMediaAccess,
  toAbsoluteMediaUrl,
} from "../utils/mediaAccess";

function getMediaApi() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- keeps query option tests independent of Expo runtime modules.
  return require("../services/api") as typeof import("../services/api");
}

export async function resolveMediaAccessUrl(reference?: MediaReference | null): Promise<string | null> {
  const { API_ORIGIN, mediaApi } = getMediaApi();
  const fallback = toAbsoluteMediaUrl(reference?.url, API_ORIGIN);
  if (!shouldRequestMediaAccess(reference)) return fallback;

  const mediaId = mediaIdFromReference(reference);
  const managedPath = managedMediaPathFromReference(reference?.url);
  if (mediaId) {
    const response = await mediaApi.getAccessUrl(mediaId);
    return toAbsoluteMediaUrl(response.data.url, API_ORIGIN);
  }
  if (managedPath) {
    const response = await mediaApi.getAccessUrlForPath(managedPath);
    return toAbsoluteMediaUrl(response.data.url, API_ORIGIN);
  }
  return fallback;
}

export function mediaAccessQueryOptions(reference?: MediaReference | null) {
  return {
    ...mediaAccessQueryPolicy(reference),
    queryFn: () => resolveMediaAccessUrl(reference),
  } as const;
}

export function useMediaAccessUrl(reference?: MediaReference | null) {
  const requiresAccessUrl = shouldRequestMediaAccess(reference);
  const { API_ORIGIN } = getMediaApi();
  const fallback = toAbsoluteMediaUrl(reference?.url, API_ORIGIN);
  const query = useQuery(mediaAccessQueryOptions(reference));

  return {
    uri: requiresAccessUrl ? query.data ?? null : fallback,
    isLoading: requiresAccessUrl && query.isLoading,
    isError: requiresAccessUrl && query.isError,
    refresh: query.refetch,
  };
}
