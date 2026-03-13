import * as assert from "node:assert";
import { normalizeTemplatePath, resolveTemplate } from "../template";

// Avoid lint/suspicious/noTemplateCurlyInString: ${name} is an intentional
// newf template variable, not a JS template literal mistake.
const N = "$" + "{name}";

const templates = {
  "*.tsx": `export default function ${N}() {\n  return <div />;\n}\n`,
  "*.test.ts": "import { describe, it } from 'node:test';\n",
  "*.ts": `// ${N}\n`,
};

suite("normalizeTemplatePath", () => {
  test("converts backslashes to forward slashes", () => {
    assert.strictEqual(
      normalizeTemplatePath("src\\components\\Button.tsx"),
      "src/components/Button.tsx",
    );
  });

  test("leaves forward-slash paths unchanged", () => {
    assert.strictEqual(
      normalizeTemplatePath("src/components/Button.tsx"),
      "src/components/Button.tsx",
    );
  });
});

suite("resolveTemplate", () => {
  test("matches basename-only pattern *.tsx and substitutes name", () => {
    const result = resolveTemplate("src/Button.tsx", templates);
    assert.strictEqual(
      result,
      "export default function Button() {\n  return <div />;\n}\n",
    );
  });

  test("first matching pattern wins (*.test.ts before *.ts)", () => {
    const result = resolveTemplate("src/foo.test.ts", templates);
    assert.strictEqual(result, "import { describe, it } from 'node:test';\n");
  });

  test("falls back to later pattern when earlier does not match", () => {
    const result = resolveTemplate("src/util.ts", templates);
    assert.strictEqual(result, "// util\n");
  });

  test("returns null when no pattern matches", () => {
    assert.strictEqual(resolveTemplate("README.md", templates), null);
  });

  test("empty templates always returns null", () => {
    assert.strictEqual(resolveTemplate("src/Foo.tsx", {}), null);
  });

  test("stem strips only the final extension", () => {
    const result = resolveTemplate("src/foo.test.ts", { "*.test.ts": N });
    assert.strictEqual(result, "foo.test");
  });

  test("replaces all occurrences of name placeholder", () => {
    const result = resolveTemplate("MyComp.tsx", {
      "*.tsx": `${N} and ${N}`,
    });
    assert.strictEqual(result, "MyComp and MyComp");
  });

  test("pattern with / matches workspace-relative path", () => {
    const result = resolveTemplate("src/components/Foo.ts", {
      "src/**/*.ts": "matched",
    });
    assert.strictEqual(result, "matched");
  });

  test("** matches files directly under the target directory", () => {
    const result = resolveTemplate("src/Foo.ts", {
      "src/**/*.ts": "matched",
    });
    assert.strictEqual(result, "matched");
  });

  test("pattern with / does not match wrong directory", () => {
    const result = resolveTemplate("lib/Foo.ts", {
      "src/**/*.ts": "matched",
    });
    assert.strictEqual(result, null);
  });

  test("Windows backslash paths are normalized before matching", () => {
    const result = resolveTemplate("src\\Button.tsx", { "*.tsx": N });
    assert.strictEqual(result, "Button");
  });
});
