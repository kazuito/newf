import * as assert from "node:assert";
import { readFileSync } from "node:fs";
import * as path from "node:path";

function readProjectFile(...parts: string[]) {
  return readFileSync(path.resolve(__dirname, "../..", ...parts), "utf8");
}

suite("Publishing", () => {
  test("does not exclude node_modules from the published package", () => {
    const vscodeIgnore = readProjectFile(".vscodeignore");
    assert.doesNotMatch(vscodeIgnore, /^node_modules\/$/m);
  });

  test("packages and publishes with dependencies included", () => {
    const publishWorkflow = readProjectFile(
      ".github",
      "workflows",
      "publish.yml",
    );
    assert.doesNotMatch(publishWorkflow, /--no-dependencies/);
  });
});
