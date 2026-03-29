import * as fs from "node:fs";
import * as path from "node:path";
import ignore, { type Ignore } from "ignore";

const SKIP_DIRS = new Set([".git", "node_modules"]);

async function walkDirectories(
  rootPath: string,
  currentPath: string,
  dirs: Set<string>,
): Promise<void> {
  const entries = await fs.promises.readdir(currentPath, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    dirs.add(relativePath);
    await walkDirectories(rootPath, fullPath, dirs);
  }
}

type IgnoreEntry = { relDir: string; ig: Ignore };

async function walkWithIgnore(
  rootPath: string,
  currentPath: string,
  dirs: Set<string>,
  parentIgnores: IgnoreEntry[],
): Promise<void> {
  const relCurrentDir = path.relative(rootPath, currentPath);
  const igs = [...parentIgnores];
  try {
    const content = await fs.promises.readFile(
      path.join(currentPath, ".gitignore"),
      "utf-8",
    );
    igs.push({ relDir: relCurrentDir, ig: ignore().add(content) });
  } catch {
    // no .gitignore here
  }

  const entries = await fs.promises.readdir(currentPath, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(currentPath, entry.name);
    const relFromRoot = path.relative(rootPath, fullPath);

    const isIgnored = igs.some(({ relDir, ig }) => {
      const rel =
        relDir === "" ? relFromRoot : path.relative(relDir, relFromRoot);
      return ig.ignores(rel) || ig.ignores(`${rel}/`);
    });
    if (isIgnored) continue;

    dirs.add(relFromRoot);
    await walkWithIgnore(rootPath, fullPath, dirs, igs);
  }
}

export async function getDirectories(
  rootPath: string,
  respectGitignore = true,
): Promise<string[]> {
  const dirs = new Set<string>();
  dirs.add(".");
  if (respectGitignore) {
    await walkWithIgnore(rootPath, rootPath, dirs, []);
  } else {
    await walkDirectories(rootPath, rootPath, dirs);
  }
  return [...dirs].sort();
}

export async function createFile(
  basePath: string,
  rawFileName: string,
  content = "",
): Promise<{ path: string; alreadyExisted: boolean; isDirectory: boolean }> {
  const isDirectoryIntent =
    rawFileName.endsWith("/") || rawFileName.endsWith(path.sep);

  let fileName = rawFileName;
  if (fileName.startsWith("/")) {
    fileName = fileName.slice(1);
  }
  if (isDirectoryIntent) {
    fileName = fileName.replace(/[/\\]+$/, "");
  }

  const resolvedBase = path.resolve(basePath);
  const fullPath = path.resolve(resolvedBase, fileName);

  if (
    fullPath !== resolvedBase &&
    !fullPath.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error(
      `Path traversal detected: "${rawFileName}" resolves outside the base directory`,
    );
  }

  if (isDirectoryIntent) {
    let alreadyExisted = false;
    try {
      await fs.promises.access(fullPath);
      alreadyExisted = true;
    } catch {
      // doesn't exist yet
    }
    await fs.promises.mkdir(fullPath, { recursive: true });
    return { path: fullPath, alreadyExisted, isDirectory: true };
  }

  const dir = path.dirname(fullPath);
  await fs.promises.mkdir(dir, { recursive: true });

  try {
    await fs.promises.writeFile(fullPath, content, { flag: "wx" });
    return { path: fullPath, alreadyExisted: false, isDirectory: false };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "EEXIST"
    ) {
      return { path: fullPath, alreadyExisted: true, isDirectory: false };
    }
    throw err;
  }
}
