import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { createFile } from "./filesystem";
import { expandInput } from "./parsing";

export function selectOpenTarget(
  created: string[],
  skipped: Array<{ path: string; raw: string }>,
): string | null {
  if (created.length > 0) return created[created.length - 1];
  if (skipped.length > 0) return skipped[skipped.length - 1].path;
  return null;
}

export function skippedRawNames(
  skipped: Array<{ path: string; raw: string }>,
): string[] {
  return skipped.map((entry) => entry.raw);
}

export async function runCreate(
  basePath: string,
  input: string,
): Promise<void> {
  let fileNames: string[];
  try {
    fileNames = expandInput(input);
  } catch (err) {
    vscode.window.showErrorMessage(
      err instanceof Error ? err.message : "Invalid input pattern.",
    );
    return;
  }

  const created: string[] = [];
  const skipped: Array<{ path: string; raw: string }> = [];
  const failed: string[] = [];

  for (const raw of fileNames) {
    try {
      const result = await createFile(basePath, raw);
      if (result.alreadyExisted) {
        skipped.push({ path: result.path, raw });
      } else {
        created.push(result.path);
      }
    } catch (err) {
      failed.push(
        `"${raw}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const toOpen = selectOpenTarget(created, skipped);

  if (toOpen) {
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(toOpen),
    );
    await vscode.window.showTextDocument(doc);
  }

  if (skipped.length > 0) {
    const names = skippedRawNames(skipped).join(", ");
    vscode.window.showWarningMessage(
      `${skipped.length} file${skipped.length > 1 ? "s" : ""} already existed and were not modified: ${names}`,
    );
  }

  if (created.length > 0) {
    const label =
      created.length === 1
        ? `Created ${path.basename(created[0])}`
        : `Created ${created.length} files`;
    const action = await vscode.window.showInformationMessage(label, "Undo");
    if (action === "Undo") {
      for (const p of created) {
        try {
          await fs.promises.unlink(p);
        } catch {
          // Ignore files that were already removed.
        }
      }
    }
  }

  for (const msg of failed) {
    vscode.window.showErrorMessage(`Failed to create ${msg}`);
  }
}
