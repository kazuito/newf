import * as vscode from "vscode";
import { runCreate } from "../runCreate";
import { patternValidateInput } from "../validate";

export async function newFileAtRootCommand() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  const input = await vscode.window.showInputBox({
    prompt: "Path from workspace root — supports brace expansion",
    placeHolder: "e.g. src/components/{Header,Footer}.tsx",
    validateInput: patternValidateInput,
  });
  if (!input) return;

  await runCreate(rootPath, input);
}
