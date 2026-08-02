import assert from "node:assert/strict";
import test from "node:test";

import { imageDimensionsFromLoadEvent } from "../utils/imageDimensions";

test("reads native image dimensions from nativeEvent.source", () => {
  assert.deepEqual(
    imageDimensionsFromLoadEvent({ nativeEvent: { source: { width: 1200, height: 800 } } }),
    { width: 1200, height: 800 },
  );
});

test("reads React Native Web dimensions from the DOM image target", () => {
  assert.deepEqual(
    imageDimensionsFromLoadEvent({ nativeEvent: { target: { naturalWidth: 1920, naturalHeight: 1080 } } }),
    { width: 1920, height: 1080 },
  );
});

test("missing or invalid load dimensions preserve the fallback without throwing", () => {
  assert.equal(imageDimensionsFromLoadEvent({ nativeEvent: {} }), undefined);
  assert.equal(imageDimensionsFromLoadEvent({}), undefined);
  assert.equal(
    imageDimensionsFromLoadEvent({ nativeEvent: { source: { width: 0, height: 0 } } }),
    undefined,
  );
});
