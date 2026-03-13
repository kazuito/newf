import * as assert from "node:assert";
import * as os from "node:os";
import * as path from "node:path";
import {
  normalizeDirInput,
  shouldShowCreateItem,
} from "../commands/newFileCommand";

suite("normalizeDirInput", () => {
  test("trims whitespace", () => {
    assert.strictEqual(normalizeDirInput("  src  "), "src");
  });

  test("strips leading ./", () => {
    assert.strictEqual(normalizeDirInput("./src/components"), "src/components");
  });

  test("strips repeated leading ./", () => {
    assert.strictEqual(
      normalizeDirInput("././src/components"),
      "src/components",
    );
  });

  test("normalizes internal backslashes to forward slashes", () => {
    assert.strictEqual(
      normalizeDirInput("src\\components\\forms"),
      "src/components/forms",
    );
  });

  test("strips trailing slash", () => {
    assert.strictEqual(normalizeDirInput("src/"), "src");
  });

  test("strips trailing backslash", () => {
    assert.strictEqual(normalizeDirInput("src\\"), "src");
  });

  test("strips multiple trailing slashes", () => {
    assert.strictEqual(normalizeDirInput("src//"), "src");
  });

  test("empty string stays empty", () => {
    assert.strictEqual(normalizeDirInput(""), "");
  });

  test("whitespace-only becomes empty", () => {
    assert.strictEqual(normalizeDirInput("   "), "");
  });
});

suite("shouldShowCreateItem", () => {
  // Use a temp-dir-style absolute path as rootPath
  const root = path.join(os.tmpdir(), "newf-picker-test");
  const dirs = [".", "src", "src/components"];

  test("returns true for a new valid nested directory", () => {
    assert.strictEqual(
      shouldShowCreateItem("src/newcomponents", dirs, root),
      true,
    );
  });

  test("returns false when directory already exists in dirs", () => {
    assert.strictEqual(shouldShowCreateItem("src", dirs, root), false);
  });

  test("returns false when directory already exists with different separators", () => {
    assert.strictEqual(
      shouldShowCreateItem("src/components", [".", "src\\components"], root),
      false,
    );
  });

  test("returns false for empty string", () => {
    assert.strictEqual(shouldShowCreateItem("", dirs, root), false);
  });

  test("returns false for dot", () => {
    assert.strictEqual(shouldShowCreateItem(".", dirs, root), false);
  });

  test("returns false for path traversal with ../", () => {
    assert.strictEqual(shouldShowCreateItem("../escape", dirs, root), false);
  });

  test("returns false for nested path traversal", () => {
    assert.strictEqual(
      shouldShowCreateItem("a/../../escape", dirs, root),
      false,
    );
  });

  test("returns false for absolute paths", () => {
    assert.strictEqual(shouldShowCreateItem("/etc/passwd", dirs, root), false);
  });
});
