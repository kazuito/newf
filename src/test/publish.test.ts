import * as assert from "node:assert";
import { readFileSync } from "node:fs";
import * as path from "node:path";

function readProjectFile(...parts: string[]) {
  return readFileSync(path.resolve(__dirname, "../..", ...parts), "utf8");
}

suite("Publishing", () => {
  test("excludes build-only dependencies and test output from the published package", () => {
    const vscodeIgnore = readProjectFile(".vscodeignore");
    assert.match(vscodeIgnore, /^\.env$/m);
    assert.match(vscodeIgnore, /^\.env\.\*$/m);
    assert.match(vscodeIgnore, /^node_modules\/$/m);
    assert.match(vscodeIgnore, /^out-test\/$/m);
  });

  test("packages and publishes the bundle without runtime dependencies", () => {
    const publishWorkflow = readProjectFile(
      ".github",
      "workflows",
      "publish.yml",
    );
    assert.match(publishWorkflow, /--no-dependencies/);
  });

  test("build scripts use rolldown for the extension bundle", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };

    assert.strictEqual(packageJson.scripts.bundle, "rolldown -c");
    assert.strictEqual(
      packageJson.scripts.compile,
      "pnpm run bundle && pnpm run compile:tests",
    );
    assert.strictEqual(
      packageJson.scripts.package,
      "vsce package --no-dependencies",
    );
  });

  test("bundled runtime dependencies stay out of package.json dependencies", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    assert.strictEqual(
      packageJson.dependencies?.["brace-expansion"],
      undefined,
    );
    assert.strictEqual(
      packageJson.devDependencies?.["brace-expansion"],
      "^5.0.4",
    );
  });
});
