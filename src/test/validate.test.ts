import * as assert from "node:assert";
import * as vscode from "vscode";
import { patternValidateInput } from "../validate";

suite("patternValidateInput", () => {
  test("returns null for empty input", () => {
    assert.strictEqual(patternValidateInput(""), null);
  });

  test("returns null for whitespace-only input", () => {
    assert.strictEqual(patternValidateInput("   "), null);
  });

  test("returns null for a single file name", () => {
    assert.strictEqual(patternValidateInput("index.ts"), null);
  });

  test("shows file names for 2 files", () => {
    const result = patternValidateInput("{a,b}.ts");
    assert.ok(result);
    assert.strictEqual(result.severity, vscode.InputBoxValidationSeverity.Info);
    assert.match(result.message, /Will create 2 files: a\.ts, b\.ts/);
  });

  test("shows all names when count is exactly 5", () => {
    const result = patternValidateInput("{a,b,c,d,e}.ts");
    assert.ok(result);
    assert.match(
      result.message,
      /Will create 5 files: a\.ts, b\.ts, c\.ts, d\.ts, e\.ts/,
    );
    assert.doesNotMatch(result.message, /more/);
  });

  test("caps preview at 5 and appends +N more for 6 files", () => {
    const result = patternValidateInput("{a,b,c,d,e,f}.ts");
    assert.ok(result);
    assert.match(result.message, /Will create 6 files:/);
    assert.match(result.message, /\(\+1 more\)/);
  });

  test("caps preview at 5 and appends correct count for many files", () => {
    const result = patternValidateInput("{01..10}.txt");
    assert.ok(result);
    assert.match(result.message, /Will create 10 files:/);
    assert.match(result.message, /\(\+5 more\)/);
  });

  test("returns error severity when expansion exceeds 100 files", () => {
    const result = patternValidateInput("{001..200}.txt");
    assert.ok(result);
    assert.strictEqual(
      result.severity,
      vscode.InputBoxValidationSeverity.Error,
    );
  });
});
