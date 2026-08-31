import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import type { AxiosAdapter } from "axios";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "react-native") return nextResolve("react-native-web", context);
    if (specifier === "expo-secure-store" || specifier === "expo-constants") return nextResolve("node:fs", context);
    return nextResolve(specifier, context);
  },
});

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = true;

const apiModulePromise = import("../services/api");

test("대표 이미지 변경 서비스는 게시글 전체 PUT 대신 전용 media_id API를 호출한다", async () => {
  const { api, postApi } = await apiModulePromise;
  const captured: { url?: string; method?: string; data?: string }[] = [];
  const originalAdapter = api.defaults.adapter;
  const adapter: AxiosAdapter = async (config) => {
    captured.push({ url: config.url, method: config.method, data: config.data });
    return {
      config,
      data: { status: "success", data: { post_id: 41, media_id: 99 } },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  api.defaults.adapter = adapter;

  try {
    const replaceRepresentativeImage = (postApi as typeof postApi & {
      replaceRepresentativeImage?: (postId: number, mediaId: number) => Promise<unknown>;
    }).replaceRepresentativeImage;
    assert.equal(typeof replaceRepresentativeImage, "function");
    await replaceRepresentativeImage!(41, 99);
  } finally {
    api.defaults.adapter = originalAdapter;
  }

  assert.deepEqual(captured, [{
    url: "/posts/41/representative-image",
    method: "put",
    data: JSON.stringify({ media_id: 99 }),
  }]);
});
