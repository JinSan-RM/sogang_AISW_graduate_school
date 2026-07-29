import { useQuery } from "@tanstack/react-query";

import { API_ORIGIN, mediaApi } from "../services/api";
import type { MediaReference } from "../utils/mediaAccess";
import {
  managedMediaPathFromReference,
  mediaIdFromReference,
  shouldRequestMediaAccess,
  toAbsoluteMediaUrl,
} from "../utils/mediaAccess";

const ACCESS_URL_REFRESH_MS = 4 * 60 * 1000;

export async function resolveMediaAccessUrl(reference?: MediaReference | null): Promise<string | null> {
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

export function useMediaAccessUrl(reference?: MediaReference | null) {
  const requiresAccessUrl = shouldRequestMediaAccess(reference);
  const mediaId = mediaIdFromReference(reference);
  const managedPath = managedMediaPathFromReference(reference?.url);
  const fallback = toAbsoluteMediaUrl(reference?.url, API_ORIGIN);
  const query = useQuery({
    queryKey: ["media-access-url", mediaId, managedPath],
    queryFn: () => resolveMediaAccessUrl(reference),
    enabled: requiresAccessUrl,
    staleTime: ACCESS_URL_REFRESH_MS,
    refetchInterval: requiresAccessUrl ? ACCESS_URL_REFRESH_MS : false,
    retry: 1,
  });

  return {
    uri: requiresAccessUrl ? query.data ?? null : fallback,
    isLoading: requiresAccessUrl && query.isLoading,
    isError: requiresAccessUrl && query.isError,
    refresh: query.refetch,
  };
}
