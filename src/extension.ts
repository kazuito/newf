import * as path from "node:path";
import * as vscode from "vscode";
import { createFile, getDirectories } from "./filesystem";
import { expandInput } from "./parsing";

async function createFileCommand() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  const dirs = await getDirectories(rootPath);
  const selectedDir = await vscode.window.showQuickPick(dirs, {
    placeHolder: "Select a directory",
  });
  if (!selectedDir) {
    return;
  }

  const input = await vscode.window.showInputBox({
    prompt: `Create in "${selectedDir}" — supports brace expansion (e.g. {a,b}.md, {01..05}.md)`,
    placeHolder: "file name or pattern (e.g. components/{Header,Footer}.tsx)",
  });
  if (!input) {
    return;
  }

  const basePath = path.join(rootPath, selectedDir);

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

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "newf.create",
    createFileCommand,
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
