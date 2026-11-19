// What a painted texture's key counts within (texscope.ts, docs/stability-plan.md Phase 4.3): the build's textures
// stand in for painted ones by key, so a key mustn't depend on which sites were built first.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inTexScope,
  scopedKey,
  texScope,
} from "../src/scripts/city3d/texscope";

test("outside any site, keys count across the city, as before", () => {
  assert.equal(texScope(), "");
  const a = scopedKey("t-boot-64x64");
  const b = scopedKey("t-boot-64x64");
  assert.equal(a, "t-boot-64x64-0");
  assert.equal(b, "t-boot-64x64-1");
});

test("a site's textures are counted within the site, whatever was built before it", () => {
  const first = inTexScope("lot a", () => [
    scopedKey("t-sign-128x64"),
    scopedKey("t-sign-128x64"),
  ]);
  const second = inTexScope("lot b", () => [scopedKey("t-sign-128x64")]);
  assert.deepEqual(first, ["lot a|t-sign-128x64-0", "lot a|t-sign-128x64-1"]);
  assert.deepEqual(second, ["lot b|t-sign-128x64-0"]);
  // built the other way round: the same keys
  const b2 = inTexScope("lot b", () => [scopedKey("t-sign-128x64")]);
  const a2 = inTexScope("lot a", () => [
    scopedKey("t-sign-128x64"),
    scopedKey("t-sign-128x64"),
  ]);
  assert.deepEqual(b2, second);
  assert.deepEqual(a2, first);
});

test("a site built again paints under the same keys; the scope ends with its builder", () => {
  const once = inTexScope("pier", () => scopedKey("t-deck-256x256"));
  const again = inTexScope("pier", () => scopedKey("t-deck-256x256"));
  assert.equal(once, again);
  assert.equal(texScope(), "");
  // (and outside again, the city's own count carries on)
  assert.equal(scopedKey("t-boot-64x64"), "t-boot-64x64-2");
});

test("a builder that throws still ends its scope", () => {
  assert.throws(() =>
    inTexScope("broken", () => {
      throw new Error("x");
    }),
  );
  assert.equal(texScope(), "");
});

test("a scope inside a scope comes back out to the outer one", () => {
  inTexScope("outer", () => {
    inTexScope("inner", () => assert.equal(texScope(), "inner"));
    assert.equal(texScope(), "outer");
  });
});
