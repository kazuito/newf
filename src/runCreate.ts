import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { createFile } from "./filesystem";
import { expandInput } from "./parsing";
import {
  getTemplates,
  normalizeTemplatePath,
  resolveTemplate,
} from "./template";

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
  workspaceRoot: string,
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

  const templates = getTemplates();
  const created: string[] = [];
  const createdDirs: string[] = [];
  const skipped: Array<{ path: string; raw: string }> = [];
  const failed: string[] = [];

  for (const raw of fileNames) {
    try {
      const isDirectoryIntent = raw.endsWith("/") || raw.endsWith(path.sep);
      let content = "";
      if (!isDirectoryIntent) {
        const absolutePath = path.resolve(
          basePath,
          raw.startsWith("/") ? raw.slice(1) : raw,
        );
        const relativePath = normalizeTemplatePath(
          path.relative(workspaceRoot, absolutePath),
        );
        content = resolveTemplate(relativePath, templates, workspaceRoot) ?? "";
      }
      const result = await createFile(basePath, raw, content);
      if (result.isDirectory) {
        if (!result.alreadyExisted) {
          createdDirs.push(result.path);
        }
      } else if (result.alreadyExisted) {
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

  const openBehavior = vscode.workspace
    .getConfiguration("newf")
    .get<string>("openAfterCreate", "last");

  if (openBehavior === "last") {
    const toOpen = selectOpenTarget(created, skipped);
    if (toOpen) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(toOpen),
      );
      await vscode.window.showTextDocument(doc);
    }
  } else if (openBehavior === "all") {
    for (const p of created) {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(p));
      await vscode.window.showTextDocument(doc, { preview: false });
    }
  }

  if (skipped.length > 0) {
    const names = skippedRawNames(skipped).join(", ");
    vscode.window.showWarningMessage(
      skipped.length === 1
        ? vscode.l10n.t(
            "1 file already existed and was not modified: {0}",
            names,
          )
        : vscode.l10n.t(
            "{0} files already existed and were not modified: {1}",
            skipped.length,
            names,
          ),
    );
  }

  const notifyOnCreate = vscode.workspace
    .getConfiguration("newf")
    .get<boolean>("notifyOnCreate", true);

  if (notifyOnCreate && (created.length > 0 || createdDirs.length > 0)) {
    const parts: string[] = [];
    if (created.length === 1) {
      parts.push(vscode.l10n.t("Created {0}", path.basename(created[0])));
    } else if (created.length > 1) {
      parts.push(vscode.l10n.t("Created {0} files", created.length));
    }
    if (createdDirs.length === 1) {
      parts.push(vscode.l10n.t("1 folder"));
    } else if (createdDirs.length > 1) {
      parts.push(vscode.l10n.t("{0} folders", createdDirs.length));
    }
    const label =
      parts.length === 2
        ? vscode.l10n.t("{0}, {1}", parts[0], parts[1])
        : parts[0];
    const undo = vscode.l10n.t("Undo");
    const action = await vscode.window.showInformationMessage(label, undo);
    if (action === undo) {
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
    vscode.window.showErrorMessage(vscode.l10n.t("Failed to create {0}", msg));
  }
}
