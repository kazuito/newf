import * as assert from "node:assert";
import { expandInput, splitTopLevelCommas } from "../parsing";

suite("splitTopLevelCommas", () => {
  test("splits simple comma-separated values", () => {
    assert.deepStrictEqual(splitTopLevelCommas("a,b,c"), ["a", "b", "c"]);
  });

  test("does not split commas inside braces", () => {
    assert.deepStrictEqual(splitTopLevelCommas("{a,b},c"), ["{a,b}", "c"]);
  });

  test("handles nested braces", () => {
    assert.deepStrictEqual(splitTopLevelCommas("{a,{b,c}},d"), [
      "{a,{b,c}}",
      "d",
    ]);
  });

  test("returns single element when no commas", () => {
    assert.deepStrictEqual(splitTopLevelCommas("abc"), ["abc"]);
  });

  test("handles empty string", () => {
    assert.deepStrictEqual(splitTopLevelCommas(""), [""]);
  });

  test("handles unbalanced closing brace gracefully", () => {
    assert.deepStrictEqual(splitTopLevelCommas("a},b"), ["a}", "b"]);
  });
});

suite("expandInput", () => {
  test("expands brace expressions", () => {
    const result = expandInput("{a,b}.md");
    assert.deepStrictEqual(result, ["a.md", "b.md"]);
  });

  test("expands numeric ranges", () => {
    const result = expandInput("{01..03}.txt");
    assert.deepStrictEqual(result, ["01.txt", "02.txt", "03.txt"]);
  });

  test("deduplicates results", () => {
    const result = expandInput("a.md, a.md");
    assert.deepStrictEqual(result, ["a.md"]);
  });

  test("trims whitespace from segments", () => {
    const result = expandInput("  a.md , b.md  ");
    assert.deepStrictEqual(result, ["a.md", "b.md"]);
  });

  test("returns empty array for empty input", () => {
    assert.deepStrictEqual(expandInput(""), []);
  });

  test("returns empty array for whitespace-only input", () => {
    assert.deepStrictEqual(expandInput("   "), []);
  });

  test("handles top-level commas with brace expansion", () => {
    const result = expandInput("{a,b}.ts, c.ts");
    assert.deepStrictEqual(result, ["a.ts", "b.ts", "c.ts"]);
  });

  test("throws when expansion exceeds 100 files", () => {
    assert.throws(() => expandInput("{001..200}.txt"), /more than 100 files/);
  });

  test("allows expansion up to 100 files", () => {
    const result = expandInput("{01..99}.txt");
    assert.strictEqual(result.length, 99);
  });
});
