import * as assert from "node:assert";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { createFile, getDirectories } from "../filesystem";

const execFileAsync = promisify(execFile);

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "newf-test-"));
}

suite("createFile", () => {
  let tmpDir: string;

  setup(() => {
    tmpDir = makeTmpDir();
  });

  teardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates a file in the base directory", async () => {
    const result = await createFile(tmpDir, "hello.txt");
    assert.strictEqual(result.path, path.join(tmpDir, "hello.txt"));
    assert.strictEqual(result.alreadyExisted, false);
    assert.ok(fs.existsSync(result.path));
    assert.strictEqual(fs.readFileSync(result.path, "utf-8"), "");
  });

  test("creates intermediate directories", async () => {
    const result = await createFile(tmpDir, "a/b/c.txt");
    assert.ok(fs.existsSync(result.path));
    assert.ok(fs.statSync(path.join(tmpDir, "a", "b")).isDirectory());
  });

  test("strips a leading slash", async () => {
    const result = await createFile(tmpDir, "/leading.txt");
    assert.strictEqual(result.path, path.join(tmpDir, "leading.txt"));
    assert.ok(fs.existsSync(result.path));
  });

  test("is idempotent when file already exists", async () => {
    fs.writeFileSync(path.join(tmpDir, "existing.txt"), "content");
    const first = await createFile(tmpDir, "new-first.txt");
    assert.strictEqual(first.alreadyExisted, false);
    const result = await createFile(tmpDir, "existing.txt");
    assert.strictEqual(result.alreadyExisted, true);
    assert.strictEqual(fs.readFileSync(result.path, "utf-8"), "content");
  });

  test("does not truncate existing file contents", async () => {
    const filePath = path.join(tmpDir, "with-content.txt");
    fs.writeFileSync(filePath, "important data");
    const result = await createFile(tmpDir, "with-content.txt");
    assert.strictEqual(result.alreadyExisted, true);
    assert.strictEqual(fs.readFileSync(filePath, "utf-8"), "important data");
  });

  test("allows deeply nested paths within base", async () => {
    const result = await createFile(tmpDir, "a/b/c/d/e.txt");
    assert.ok(fs.existsSync(result.path));
    assert.ok(result.path.startsWith(tmpDir));
  });

  test("rejects path traversal with ../", async () => {
    await assert.rejects(
      () => createFile(tmpDir, "../escape.txt"),
      /Path traversal detected/,
    );
  });

  test("rejects path traversal with nested ../", async () => {
    await assert.rejects(
      () => createFile(tmpDir, "a/../../escape.txt"),
      /Path traversal detected/,
    );
  });

  test("returns isDirectory: false for regular file creation", async () => {
    const result = await createFile(tmpDir, "plain.txt");
    assert.strictEqual(result.isDirectory, false);
  });

  test("creates a directory when name ends with /", async () => {
    const result = await createFile(tmpDir, "mydir/");
    assert.strictEqual(result.isDirectory, true);
    assert.strictEqual(result.alreadyExisted, false);
    assert.ok(fs.statSync(result.path).isDirectory());
  });

  test("directory intent: path resolves without trailing slash", async () => {
    const result = await createFile(tmpDir, "utils/");
    assert.strictEqual(result.path, path.join(tmpDir, "utils"));
  });

  test("directory intent: creates intermediate segments", async () => {
    const result = await createFile(tmpDir, "a/b/c/");
    assert.ok(fs.statSync(result.path).isDirectory());
    assert.strictEqual(result.path, path.join(tmpDir, "a", "b", "c"));
  });

  test("directory intent: alreadyExisted is true when dir exists", async () => {
    fs.mkdirSync(path.join(tmpDir, "existing-dir"));
    const result = await createFile(tmpDir, "existing-dir/");
    assert.strictEqual(result.isDirectory, true);
    assert.strictEqual(result.alreadyExisted, true);
  });

  test("directory intent: alreadyExisted is false for new dir", async () => {
    const result = await createFile(tmpDir, "brand-new/");
    assert.strictEqual(result.isDirectory, true);
    assert.strictEqual(result.alreadyExisted, false);
  });

  test("writes provided content into a newly created file", async () => {
    const result = await createFile(tmpDir, "templated.ts", "// hello\n");
    assert.strictEqual(result.alreadyExisted, false);
    assert.strictEqual(fs.readFileSync(result.path, "utf-8"), "// hello\n");
  });

  test("does not overwrite content when file already exists", async () => {
    fs.writeFileSync(path.join(tmpDir, "existing.ts"), "original content");
    const result = await createFile(tmpDir, "existing.ts", "new content");
    assert.strictEqual(result.alreadyExisted, true);
    assert.strictEqual(
      fs.readFileSync(result.path, "utf-8"),
      "original content",
    );
  });

  test("ignores content for directory intent", async () => {
    const result = await createFile(tmpDir, "mydir/", "should be ignored");
    assert.strictEqual(result.isDirectory, true);
    assert.ok(fs.statSync(result.path).isDirectory());
  });
});

suite("getDirectories", () => {
  suite("git mode", () => {
    let tmpDir: string;

    setup(async () => {
      tmpDir = makeTmpDir();
      await execFileAsync("git", ["init"], { cwd: tmpDir });
      await execFileAsync("git", ["config", "user.email", "test@test.com"], {
        cwd: tmpDir,
      });
      await execFileAsync("git", ["config", "user.name", "Test"], {
        cwd: tmpDir,
      });

      // Create tracked files in various directories
      fs.mkdirSync(path.join(tmpDir, "src", "utils"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "index.ts"), "");
      fs.writeFileSync(path.join(tmpDir, "src", "utils", "helper.ts"), "");

      // Create a hidden directory (should be excluded)
      fs.mkdirSync(path.join(tmpDir, ".hidden"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, ".hidden", "secret.txt"), "");

      // Create a gitignored directory
      fs.writeFileSync(path.join(tmpDir, ".gitignore"), "ignored/\n");
      fs.mkdirSync(path.join(tmpDir, "ignored"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "ignored", "file.txt"), "");

      await execFileAsync("git", ["add", "."], { cwd: tmpDir });
      await execFileAsync("git", ["commit", "-m", "init"], { cwd: tmpDir });
    });

    teardown(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test("returns tracked directories with parent segments", async () => {
      const dirs = await getDirectories(tmpDir);
      assert.ok(dirs.includes("."));
      assert.ok(dirs.includes("src"));
      assert.ok(dirs.includes("src/utils"));
    });

    test("excludes hidden directories", async () => {
      const dirs = await getDirectories(tmpDir);
      const hasHidden = dirs.some((d) => d.startsWith(".") && d !== ".");
      assert.strictEqual(hasHidden, false);
    });

    test("excludes gitignored directories", async () => {
      const dirs = await getDirectories(tmpDir);
      assert.ok(!dirs.includes("ignored"));
    });

    test("result is sorted and includes dot", async () => {
      const dirs = await getDirectories(tmpDir);
      assert.strictEqual(dirs[0], ".");
      const sorted = [...dirs].sort();
      assert.deepStrictEqual(dirs, sorted);
    });
  });

  suite("fallback mode (non-git)", () => {
    let tmpDir: string;

    setup(() => {
      tmpDir = makeTmpDir();

      fs.mkdirSync(path.join(tmpDir, "alpha", "beta"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "gamma"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, ".hidden"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "node_modules", "pkg"), {
        recursive: true,
      });
    });

    teardown(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test("walks directories recursively", async () => {
      const dirs = await getDirectories(tmpDir);
      assert.ok(dirs.includes("alpha"));
      assert.ok(dirs.includes("alpha/beta"));
      assert.ok(dirs.includes("gamma"));
    });

    test("excludes hidden directories and node_modules", async () => {
      const dirs = await getDirectories(tmpDir);
      assert.ok(!dirs.includes(".hidden"));
      assert.ok(!dirs.includes("node_modules"));
      assert.ok(!dirs.includes("node_modules/pkg"));
    });

    test("result is sorted and includes dot", async () => {
      const dirs = await getDirectories(tmpDir);
      assert.strictEqual(dirs[0], ".");
      const sorted = [...dirs].sort();
      assert.deepStrictEqual(dirs, sorted);
    });
  });
});
