import * as assert from "node:assert";
import { selectOpenTarget, skippedRawNames } from "../runCreate";

suite("selectOpenTarget", () => {
  test("returns last created path when created is non-empty", () => {
    const created = ["/a/foo.ts", "/a/bar.ts"];
    const skipped = [{ path: "/a/baz.ts", raw: "baz.ts" }];
    assert.strictEqual(selectOpenTarget(created, skipped), "/a/bar.ts");
  });

  test("falls back to last skipped path when nothing was created", () => {
    const skipped = [
      { path: "/a/old.ts", raw: "old.ts" },
      { path: "/a/also-old.ts", raw: "also-old.ts" },
    ];
    assert.strictEqual(selectOpenTarget([], skipped), "/a/also-old.ts");
  });

  test("returns null when both arrays are empty", () => {
    assert.strictEqual(selectOpenTarget([], []), null);
  });

  test("returns null when only failed (no created, no skipped)", () => {
    assert.strictEqual(selectOpenTarget([], []), null);
  });
});

suite("skippedRawNames", () => {
  test("returns raw names from skipped entries", () => {
    const skipped = [
      { path: "/a/foo.ts", raw: "foo.ts" },
      { path: "/a/bar.ts", raw: "bar.ts" },
    ];
    assert.deepStrictEqual(skippedRawNames(skipped), ["foo.ts", "bar.ts"]);
  });

  test("returns empty array for no skipped entries", () => {
    assert.deepStrictEqual(skippedRawNames([]), []);
  });

  test("mixed case: created and skipped both present, raw names only from skipped", () => {
    const skipped = [{ path: "/a/existing.ts", raw: "existing.ts" }];
    assert.deepStrictEqual(skippedRawNames(skipped), ["existing.ts"]);
  });
});
