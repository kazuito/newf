import * as vscode from "vscode";
import { pickWorkspaceRoot } from "../pickWorkspaceRoot";
import { runCreate } from "../runCreate";
import { patternValidateInput } from "../validate";

export async function newFileAtRootCommand() {
  const rootPath = await pickWorkspaceRoot();
  if (!rootPath) return;

  const input = await vscode.window.showInputBox({
    prompt: "Path from workspace root — supports brace expansion",
    placeHolder: "e.g. src/components/{Header,Footer}.tsx",
    validateInput: patternValidateInput,
  });
  if (!input) return;

  await runCreate(rootPath, input);
}
