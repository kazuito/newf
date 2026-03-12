import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function walkDirectories(
  rootPath: string,
  currentPath: string,
  dirs: Set<string>,
): Promise<void> {
  const entries = await fs.promises.readdir(currentPath, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "node_modules"
    ) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);
      dirs.add(relativePath);
      await walkDirectories(rootPath, fullPath, dirs);
    }
  }
}

export async function getDirectories(rootPath: string): Promise<string[]> {
  const dirs = new Set<string>();
  dirs.add(".");

  try {
    // Use git to list all non-ignored directories
    const { stdout } = await execFileAsync(
      "git",
      ["ls-files", "--others", "--cached", "--directory", "--exclude-standard"],
      { cwd: rootPath, maxBuffer: 10 * 1024 * 1024, timeout: 10_000 },
    );

    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Collect every directory segment in the path
      const filePath = trimmed.endsWith("/")
        ? trimmed.slice(0, -1)
        : path.dirname(trimmed);
      if (filePath === ".") {
        continue;
      }

      // Add the directory and all parent directories
      let current = filePath;
      while (current && current !== ".") {
        if (!current.startsWith(".")) {
          dirs.add(current);
        }
        current = path.dirname(current);
      }
    }
  } catch {
    // Fallback: not a git repo, walk the filesystem
    await walkDirectories(rootPath, rootPath, dirs);
  }

  return [...dirs].sort();
}

export async function createFile(
  basePath: string,
  rawFileName: string,
): Promise<string> {
  let fileName = rawFileName;
  if (fileName.startsWith("/")) {
    fileName = fileName.slice(1);
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

  const dir = path.dirname(fullPath);
  await fs.promises.mkdir(dir, { recursive: true });

  if (!fs.existsSync(fullPath)) {
    await fs.promises.writeFile(fullPath, "");
  }

  return fullPath;
}
