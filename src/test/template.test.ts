import * as assert from "node:assert";
import { normalizeTemplatePath, resolveTemplate } from "../template";

// Avoid lint/suspicious/noTemplateCurlyInString: these are intentional newf
// template variables, not JS template literal mistakes.
const B = "$" + "{basename}";
const D = "$" + "{dir}";
const DATE = "$" + "{date}";
const E = "$" + "{ext}";
const N = "$" + "{name}";
const U = "$" + "{unknown}";
const W = "$" + "{workspaceFolder}";
const workspaceFolder = "/workspace";
const now = new Date(2026, 2, 14, 9, 30, 0);

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
    const result = resolveTemplate(
      "src/Button.tsx",
      templates,
      workspaceFolder,
    );
    assert.strictEqual(
      result,
      "export default function Button() {\n  return <div />;\n}\n",
    );
  });

  test("first matching pattern wins (*.test.ts before *.ts)", () => {
    const result = resolveTemplate(
      "src/foo.test.ts",
      templates,
      workspaceFolder,
    );
    assert.strictEqual(result, "import { describe, it } from 'node:test';\n");
  });

  test("falls back to later pattern when earlier does not match", () => {
    const result = resolveTemplate("src/util.ts", templates, workspaceFolder);
    assert.strictEqual(result, "// util\n");
  });

  test("returns null when no pattern matches", () => {
    assert.strictEqual(
      resolveTemplate("README.md", templates, workspaceFolder),
      null,
    );
  });

  test("empty templates always returns null", () => {
    assert.strictEqual(
      resolveTemplate("src/Foo.tsx", {}, workspaceFolder),
      null,
    );
  });

  test("stem strips only the final extension", () => {
    const result = resolveTemplate(
      "src/foo.test.ts",
      { "*.test.ts": N },
      workspaceFolder,
    );
    assert.strictEqual(result, "foo.test");
  });

  test("replaces all occurrences of name placeholder", () => {
    const result = resolveTemplate(
      "MyComp.tsx",
      {
        "*.tsx": `${N} and ${N}`,
      },
      workspaceFolder,
    );
    assert.strictEqual(result, "MyComp and MyComp");
  });

  test("pattern with / matches workspace-relative path", () => {
    const result = resolveTemplate(
      "src/components/Foo.ts",
      {
        "src/**/*.ts": "matched",
      },
      workspaceFolder,
    );
    assert.strictEqual(result, "matched");
  });

  test("** matches files directly under the target directory", () => {
    const result = resolveTemplate(
      "src/Foo.ts",
      {
        "src/**/*.ts": "matched",
      },
      workspaceFolder,
    );
    assert.strictEqual(result, "matched");
  });

  test("pattern with / does not match wrong directory", () => {
    const result = resolveTemplate(
      "lib/Foo.ts",
      {
        "src/**/*.ts": "matched",
      },
      workspaceFolder,
    );
    assert.strictEqual(result, null);
  });

  test("Windows backslash paths are normalized before matching", () => {
    const result = resolveTemplate(
      "src\\Button.tsx",
      { "*.tsx": N },
      "C:\\workspace",
    );
    assert.strictEqual(result, "Button");
  });

  test("replaces basename, ext, dir, workspaceFolder, and date", () => {
    const result = resolveTemplate(
      "src/components/Button.test.ts",
      {
        "*.ts": `${B}|${E}|${D}|${W}|${DATE}`,
      },
      workspaceFolder,
      now,
    );
    assert.strictEqual(
      result,
      "Button.test.ts|.ts|src/components|/workspace|2026-03-14",
    );
  });

  test("dir becomes dot for files at the workspace root", () => {
    const result = resolveTemplate(
      "README.md",
      { "*.md": D },
      workspaceFolder,
      now,
    );
    assert.strictEqual(result, ".");
  });

  test("ext is empty for files without an extension", () => {
    const result = resolveTemplate(
      "Dockerfile",
      { Dockerfile: `${N}|${E}|${B}` },
      workspaceFolder,
      now,
    );
    assert.strictEqual(result, "Dockerfile||Dockerfile");
  });

  test("unknown placeholders remain unchanged", () => {
    const result = resolveTemplate(
      "src/index.ts",
      { "*.ts": `${N}|${U}` },
      workspaceFolder,
      now,
    );
    assert.strictEqual(result, `index|${U}`);
  });

  test("workspaceFolder and dir normalize Windows separators", () => {
    const result = resolveTemplate(
      "src\\nested\\Button.ts",
      { "*.ts": `${D}|${W}` },
      "C:\\workspace\\demo",
      now,
    );
    assert.strictEqual(result, "src/nested|C:/workspace/demo");
  });
});
