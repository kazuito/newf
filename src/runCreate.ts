import * as vscode from "vscode";
import { createFile } from "./filesystem";
import { expandInput } from "./parsing";

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
  const failed: string[] = [];

  for (const raw of fileNames) {
    try {
      created.push(await createFile(basePath, raw));
    } catch (err) {
      failed.push(
        `"${raw}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (created.length === 1) {
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(created[0]),
    );
    await vscode.window.showTextDocument(doc);
  } else if (created.length > 1) {
    const last = await vscode.workspace.openTextDocument(
      vscode.Uri.file(created[created.length - 1]),
    );
    await vscode.window.showTextDocument(last);
    vscode.window.showInformationMessage(`Created ${created.length} files.`);
  }

  for (const msg of failed) {
    vscode.window.showErrorMessage(`Failed to create ${msg}`);
  }
}
