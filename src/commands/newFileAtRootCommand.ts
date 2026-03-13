import * as vscode from "vscode";
import { pickWorkspaceRoot } from "../pickWorkspaceRoot";
import { runCreate } from "../runCreate";
import { patternValidateInput } from "../validate";

export async function newFileAtRootCommand() {
  const rootPath = await pickWorkspaceRoot();
  if (!rootPath) return;

  const input = await vscode.window.showInputBox({
    prompt: vscode.l10n.t(
      "Path from workspace root — supports brace expansion",
    ),
    placeHolder: vscode.l10n.t("e.g. src/components/{{Header,Footer}}.tsx"),
    validateInput: patternValidateInput,
  });
  if (!input) return;

  await runCreate(rootPath, rootPath, input);
}
