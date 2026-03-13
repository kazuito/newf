import * as vscode from "vscode";

export async function pickWorkspaceRoot(): Promise<string | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return undefined;
  }
  if (folders.length === 1) return folders[0].uri.fsPath;

  const picked = await vscode.window.showQuickPick(
    folders.map((f) => ({
      label: f.name,
      description: f.uri.fsPath,
      fsPath: f.uri.fsPath,
    })),
    { placeHolder: "Select workspace root" },
  );
  return picked?.fsPath;
}
